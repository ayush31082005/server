const User = require("../models/User");
const BinaryTree = require("../models/BinaryTree");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const fs = require("fs");
const path = require("path");
const { findExtremePosition, distributeLevelIncome, distributeDirectIncome, updateTeamPV } = require("../utils/mlmUtils");

const PACKAGE_DATA = {
    "599": { bv: 250, pv: 0.25, capping: 2000 },
    "1299": { bv: 500, pv: 0.5, capping: 4000 },
    "2699": { bv: 1000, pv: 1, capping: 10000 }
};

const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();


// ================= REGISTER =================
exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });

        if (user && user.isVerified)
            return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();

        if (!user) {
            const pkg = PACKAGE_DATA[req.body.packageType] || { bv: 0, pv: 0, capping: 0 };

            // Generate Member ID
            const generateMemberId = () => 'SPRL' + Math.floor(1000 + Math.random() * 9000).toString();
            let newMemberId = generateMemberId();
            while (await User.findOne({ memberId: newMemberId })) {
                newMemberId = generateMemberId();
            }

            // MLM Placement Logic
            let parentId = null;
            let finalPosition = req.body.position;
            if (req.body.sponsorId) {
                const placement = await findExtremePosition(req.body.sponsorId, req.body.position || "Left");
                if (placement) {
                    parentId = placement.parentId;
                    finalPosition = placement.position;
                }
            }

            user = new User({
                ...req.body,
                memberId: newMemberId,
                password: hashedPassword,
                otp,
                otpExpire: Date.now() + 5 * 60 * 1000,
                parentId: parentId,
                position: finalPosition,
                bv: pkg.bv,
                pv: pkg.pv,
                dailyCapping: pkg.capping
            });
        } else {
            user.password = hashedPassword;
            user.otp = otp;
            user.otpExpire = Date.now() + 5 * 60 * 1000;
        }

        await user.save();

        await sendEmail(email, "Registration OTP", `Your OTP is ${otp}`);

        res.json({ message: "OTP Sent to Email" });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user || user.otp !== otp || user.otpExpire < Date.now())
            return res.status(400).json({ message: "Invalid or Expired OTP" });

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        user.activeStatus = true;

        // MLM Logic: Link child to parent and distribute income
        if (user.parentId) {
            const parent = await User.findById(user.parentId);
            if (parent) {
                if (user.position.toLowerCase() === 'left') {
                    parent.left = user._id;
                } else {
                    parent.right = user._id;
                }
                await parent.save();
            }

            // Distribute Incomes
            await distributeDirectIncome(user);
            await distributeLevelIncome(user);
            await updateTeamPV(user);
        }

        // Create/Update BinaryTree record for the user themselves
        const sponsorObj = await User.findOne({
            memberId: (user.sponsorId || "").toUpperCase()
        });
        await BinaryTree.findOneAndUpdate(
            { userId: user._id },
            {
                userId: user._id,
                parentId: user.parentId,
                sponsorId: sponsorObj?._id,
                position: user.position || "Left"
            },
            { upsert: true, new: true }
        );

        await user.save();

        // Send Welcome Email
        const welcomeSubject = "Welcome to Sanyukt Parivaar";
        const welcomeText = `Dear ${user.userName || 'Member'},\n\nCongratulations! Your account has been successfully verified.\n\nYour Member ID: ${user.memberId}\n\nYou can now log in to your dashboard and explore our services.\n\nThank you for joining Sanyukt Parivaar!`;
        sendEmail(user.email, welcomeSubject, welcomeText).catch(err => console.error("Welcome Email Error:", err));

        res.json({ message: "Account Verified Successfully" });
    } catch (error) {
        console.error("verifyOtp error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


// ================= LOGIN =================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        let user;
        if (email.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findOne({ $or: [{ email: email }, { _id: email }] });
        } else if (email.toUpperCase().startsWith('SPRL') || email.toUpperCase().startsWith('SP')) {
            user = await User.findOne({ memberId: email.toUpperCase() });
        } else {
            user = await User.findOne({ email: email });
        }

        if (!user)
            return res.status(400).json({ message: "User not found" });

        if (!user.isVerified)
            return res.status(400).json({ message: "Verify Email First" });

        const match = await bcrypt.compare(password, user.password);

        if (!match)
            return res.status(400).json({ message: "Wrong Password" });

        const secret = process.env.JWT_SECRET || 'your-secret-key';
        console.log("Signing token with secret (prefix):", secret.substring(0, 5));

        const token = jwt.sign(
            { id: user._id, role: user.role },
            secret,
            { expiresIn: "1d" }
        );

        console.log("Login SUCCESS for user:", user._id);

        // Send Login Notification Email
        const loginSubject = "Login Notification - Sanyukt Parivaar";
        const loginText = `Dear ${user.userName || 'Member'},\n\nYou have successfully logged into your Sanyukt Parivaar account on ${new Date().toLocaleString()}.\n\nIf this was not you, please contact support immediately.\n\nThank you for being part of our family!`;
        sendEmail(user.email, loginSubject, loginText).catch(err => console.error("Login notification email error:", err));

        res.json({
            message: "Login Success",
            token,
            user
        });

    } catch (error) {
        console.error(`Login error:`, error);
        res.status(500).json({ message: error.message });
    }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user)
            return res.status(400).json({ message: "User not found" });

        const otp = generateOTP();

        user.otp = otp;
        user.otpExpire = Date.now() + 5 * 60 * 1000;

        await user.save();

        await sendEmail(normalizedEmail, "Reset Password OTP", `Your OTP is ${otp}`);

        console.log(`[AUTH DEBUG] OTP Sent for Reset: ${normalizedEmail}`);
        res.json({ message: "OTP Sent for Reset" });
    } catch (error) {
        console.error(`[AUTH ERROR] Forgot password: ${error.message}`, error.stack);
        console.error("Error in forgotPassword:", error);

        // Return a more descriptive error if it's likely an email issue
        if (error.message.includes('login') || error.message.includes('auth')) {
            return res.status(500).json({ message: "Email service authentication failed. Please check server configuration." });
        }

        res.status(500).json({ message: "Server Error. Please try again later." });
    }
};

// ================= PUBLIC PROFILE =================
exports.publicProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({
            $or: [
                { memberId: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
            ].filter(query => query !== null && query !== undefined)
        }).select("userName memberId");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ================= RESEND OTP =================
exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user)
            return res.status(400).json({ message: "User not found" });

        if (user.isVerified)
            return res.status(400).json({ message: "User already verified" });

        const otp = generateOTP();

        user.otp = otp;
        user.otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes

        await user.save();

        await sendEmail(normalizedEmail, "Resend OTP", `Your new OTP is ${otp}`);

        res.json({ message: "New OTP Sent Successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        console.log(`Attempting password reset for: ${email}`);

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.otp !== otp || user.otpExpire < Date.now()) {
            return res.status(400).json({ message: "Invalid or Expired OTP" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpire = undefined;

        await user.save();
        console.log(`[AUTH DEBUG] Password reset successful for ${normalizedEmail}. New hash starts with: ${hashedPassword.substring(0, 10)}`);

        res.json({ message: "Password Reset Successful" });
    } catch (error) {
        console.error(`[AUTH ERROR] Password reset for ${req.body.email}: ${error.message}`);
        console.error("Error in resetPassword:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


// ================= CREATE ADMIN =================
exports.createAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "Admin already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            email,
            password: hashedPassword,
            role: "admin",
            isVerified: true
        });

        await admin.save();

        res.json({ message: "Admin Created Successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};


// ================= PROFILE =================
exports.profile = async (req, res) => {
    try {
        let user = req.user;
        if (!user.memberId) {
            const generateMemberId = () => 'SPRL' + Math.floor(1000 + Math.random() * 9000).toString();
            let newMemberId = generateMemberId();
            while (await User.findOne({ memberId: newMemberId })) {
                newMemberId = generateMemberId();
            }
            user.memberId = newMemberId;
            await user.save();
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res) => {
    try {
        const allowedFields = [
            'userName', 'fatherName', 'mobile', 'gender', 'position',
            'shippingAddress', 'state', 'district', 'assemblyArea',
            'block', 'villageCouncil', 'village', 'profileImage', 'bankDetails'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: false }
        ).select('-password -otp -otpExpire');

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= SUBMIT KYC =================
exports.submitKyc = async (req, res) => {
    try {
        const { aadharNumber, panNumber, bankDetails, kycDocuments } = req.body;

        const updates = {
            kycStatus: 'Submitted',
            aadharNumber,
            panNumber,
            bankDetails,
            kycDocuments
        };

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: false }
        ).select('-password -otp -otpExpire');

        res.json({ message: 'KYC submitted successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// ================= GET SPONSOR NAME =================
exports.getSponsorName = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({
            $or: [
                { memberId: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }
            ]
        }).select("userName");

        if (!user) {
            return res.status(404).json({ message: "Sponsor not found" });
        }
        res.json({ name: user.userName });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
