const Grievance = require("../models/Grievance");
const User = require("../models/User");

// ✅ CREATE GRIEVANCE
exports.createGrievance = async (req, res) => {
    try {
        console.log("========== CREATE GRIEVANCE ==========");
        console.log("1. Received data:", req.body);

        const { sellerId, name, mobile, email, category, subject, message } = req.body;

        if (!email || !name || !mobile) {
            return res.status(400).json({
                success: false,
                msg: "Email, Name and Mobile are required"
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const ticket = "TKT" + Math.floor(100000 + Math.random() * 900000);
        console.log("2. Generated ticket:", ticket);

        // Save to Grievance collection
        const newGrievance = new Grievance({
            sellerId: sellerId || "",
            name: name,
            mobile: mobile,
            email: cleanEmail,
            category: category || "",
            subject: subject || "",
            message: message || "",
            ticket: ticket,
            status: "Pending"
        });

        await newGrievance.save();
        console.log("3. ✅ Grievance saved to database");

        // Find or create user
        let user = await User.findOne({ email: cleanEmail });

        if (user) {
            console.log("4. ✅ User found:", user.email);
        } else {
            console.log("4. ⚠️ User not found, creating new user...");

            user = new User({
                email: cleanEmail,
                userName: name,
                mobile: mobile,
                grievances: []
            });

            await user.save();
            console.log("5. ✅ New user created with ID:", user._id);
        }

        // Add grievance to user
        if (!user.grievances) {
            user.grievances = [];
        }

        const exists = user.grievances.some(g => g.ticket === ticket);

        if (!exists) {
            user.grievances.push({
                ticket: ticket,
                subject: subject || "No Subject",
                status: "Pending",
                category: category || "",
                message: message || "",
                submittedDate: new Date()
            });

            await user.save();
            console.log("6. ✅ Ticket added to user account. Total:", user.grievances.length);
        }

        res.status(201).json({
            success: true,
            ticket: ticket,
            message: "Grievance submitted successfully"
        });

    } catch (err) {
        console.error("❌ Error creating grievance:", err);
        res.status(500).json({
            success: false,
            msg: "Server Error",
            error: err.message
        });
    }
};

// ✅ GET ALL GRIEVANCES (ADMIN)
exports.getAllGrievances = async (req, res) => {
    try {
        const data = await Grievance.find().sort({ createdAt: -1 });
        console.log(`📊 Admin: Found ${data.length} grievances`);
        res.json(data);
    } catch (err) {
        console.error("❌ Error fetching grievances:", err);
        res.status(500).json({ error: err.message });
    }
};

// ✅ UPDATE STATUS
exports.updateStatus = async (req, res) => {
    try {
        const { ticket, status } = req.body;
        console.log(`🔄 Updating ticket ${ticket} to ${status}`);

        const updated = await Grievance.findOneAndUpdate(
            { ticket },
            { status },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: "Ticket not found ❌" });
        }

        const user = await User.findOne({ email: updated.email });

        if (user && user.grievances) {
            const grievanceIndex = user.grievances.findIndex(g => g.ticket === ticket);

            if (grievanceIndex !== -1) {
                user.grievances[grievanceIndex].status = status;
                await user.save();
                console.log("✅ User grievance status updated");
            }
        }

        res.json({
            success: true,
            msg: "Status Updated ✅",
            data: updated
        });

    } catch (err) {
        console.error("❌ Error updating status:", err);
        res.status(500).json({ error: err.message });
    }
};

// ✅ TRACK GRIEVANCE
exports.trackGrievance = async (req, res) => {
    try {
        const { ticket } = req.body;
        console.log("🔍 Tracking Ticket:", ticket);

        const data = await Grievance.findOne({ ticket });

        if (!data) {
            return res.status(404).json({ msg: "Ticket not found ❌" });
        }

        res.json({
            ticketNumber: data.ticket,
            status: data.status,
            submittedDate: data.createdAt,
            subject: data.subject,
            category: data.category
        });

    } catch (err) {
        console.error("❌ Error tracking grievance:", err);
        res.status(500).json({ error: err.message });
    }
};

// =============================================
// ✅ FIXED: SIRF LOGGED IN USER KE APNE GRIEVANCES
// =============================================
exports.getUserGrievances = async (req, res) => {
    try {
        const { email } = req.params;
        console.log("========== GET USER GRIEVANCES ==========");
        console.log("1. Requested email:", email);

        if (!email) {
            return res.status(400).json({
                success: false,
                msg: "Email is required"
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        console.log("2. Cleaned email:", cleanEmail);

        // 👇 SIRF IS EMAIL WALE GRIEVANCES FETCH KARO
        const userGrievances = await Grievance.find({
            email: cleanEmail
        }).sort({ createdAt: -1 });

        console.log(`3. Found ${userGrievances.length} grievances for ${cleanEmail}`);

        // Format for frontend
        const formattedGrievances = userGrievances.map(g => ({
            ticket: g.ticket,
            subject: g.subject,
            status: g.status,
            submittedDate: g.createdAt,
            updatedAt: g.updatedAt,
            category: g.category,
            message: g.message,
            mobile: g.mobile
        }));

        res.json({
            success: true,
            grievances: formattedGrievances
        });

    } catch (err) {
        console.error("❌ Error in getUserGrievances:", err);
        res.json({
            success: true,
            grievances: []
        });
    }
};

// ✅ FIX ALL USERS (OPTIONAL)
exports.fixAllUsersGrievances = async (req, res) => {
    try {
        console.log("========== FIX ALL USERS ==========");

        const users = await User.find({});
        let fixedCount = 0;

        for (const user of users) {
            const grievances = await Grievance.find({ email: user.email });

            if (grievances.length > 0) {
                if (!user.grievances) user.grievances = [];

                let added = 0;
                for (const g of grievances) {
                    const exists = user.grievances.some(ug => ug.ticket === g.ticket);

                    if (!exists) {
                        user.grievances.push({
                            ticket: g.ticket,
                            subject: g.subject || "No Subject",
                            status: g.status,
                            submittedDate: g.createdAt,
                            category: g.category || "",
                            message: g.message || ""
                        });
                        added++;
                    }
                }

                if (added > 0) {
                    await user.save({ validateBeforeSave: false });
                    fixedCount++;
                    console.log(`✅ Added ${added} to ${user.email}`);
                }
            }
        }

        res.json({
            success: true,
            message: `Fixed ${fixedCount} users`
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: err.message });
    }
};