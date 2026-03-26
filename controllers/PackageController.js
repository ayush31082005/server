const User = require("../models/User");
const IncomeHistory = require("../models/IncomeHistory");
const BinaryTree = require("../models/BinaryTree");
const crypto = require("crypto");

// ── Package config ────────────────────────────────────────────────────────────
const PACKAGES = {
    "599": { name: "Silver", price: 599, bv: 250, pv: 0.25, capping: 2000, directIncome: 0 },
    "1299": { name: "Gold", price: 1299, bv: 500, pv: 0.5, capping: 4000, directIncome: 50 },
    "2699": { name: "Diamond", price: 2699, bv: 1000, pv: 1, capping: 10000, directIncome: 50 },
};

/**
 * POST /api/package/activate
 * Body: { packageType: "599" | "1299" | "2699", paymentMethod: "wallet" | "upi" | "cash" }
 *
 * Flow:
 *  1. Validate package
 *  2. Check if already active on same or higher package
 *  3. Deduct from wallet (if paymentMethod === "wallet")
 *  4. Set activeStatus=true, packageType, bv, pv, dailyCapping
 *  5. Distribute Direct Income to sponsor
 *  6. Update upline Binary Tree PV/BV
 *  7. Record in IncomeHistory + Deduction
 */
exports.activatePackage = async (req, res) => {
    try {
        const { packageType, paymentMethod = "wallet" } = req.body;
        const userId = req.user._id;

        // ── 1. Validate ──────────────────────────────────────────────────────
        const pkg = PACKAGES[packageType];
        if (!pkg) {
            return res.status(400).json({ success: false, message: "Invalid package type. Choose 599, 1299 or 2699." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // ── 2. Already on same or higher package? ────────────────────────────
        const currentPkg = PACKAGES[user.packageType];
        if (user.activeStatus && currentPkg && currentPkg.price >= pkg.price) {
            return res.status(400).json({
                success: false,
                message: `You are already active on a ${currentPkg.name} or higher package.`
            });
        }

        // ── 3. Payment verification (Wallet or Razorpay) ─────────────────────
        if (paymentMethod === "wallet") {
            if ((user.walletBalance || 0) < pkg.price) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient wallet balance. Required: ₹${pkg.price}, Available: ₹${user.walletBalance || 0}`
                });
            }
            user.walletBalance -= pkg.price;
        } else if (paymentMethod === "razorpay") {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ success: false, message: "Missing Razorpay payment details." });
            }

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Invalid payment signature verification failed." });
            }
        }
        // For "upi" / "cash" - admin will verify separately, but we still activate
        // (In production: verify Razorpay payment_id here before activating)

        // ── 4. Activate user ─────────────────────────────────────────────────
        const prevBV = user.bv || 0;
        const prevPV = user.pv || 0;

        user.packageType = packageType;
        user.activeStatus = true;
        user.dailyCapping = pkg.capping;
        user.bv = prevBV + pkg.bv;
        user.pv = prevPV + pkg.pv;

        await user.save();

        // ── 5. Distribute Direct Income to sponsor ────────────────────────────
        // Direct income Rule: ₹50 for 0.5 PV or above packages
        if (user.sponsorId && pkg.directIncome > 0) {
            const sponsor = await User.findOne({ memberId: user.sponsorId });
            if (sponsor && sponsor.activeStatus) {
                const directIncome = pkg.directIncome;
                sponsor.walletBalance = (sponsor.walletBalance || 0) + directIncome;
                sponsor.totalDirectIncome = (sponsor.totalDirectIncome || 0) + directIncome;
                await sponsor.save();

                await IncomeHistory.create({
                    userId: sponsor._id,
                    fromUserId: user._id,
                    amount: directIncome,
                    type: "Direct",
                    description: `Direct income from ${user.userName || user.memberId} - ${pkg.name} package activation`,
                });
            }
        }

        // ── 6. Update upline Binary Tree PV/BV ───────────────────────────────
        let currentParentId = user.parentId;
        let childId = user._id;

        while (currentParentId) {
            const parent = await User.findById(currentParentId);
            if (!parent) break;

            const isLeft = parent.left && parent.left.toString() === childId.toString();
            const isRight = parent.right && parent.right.toString() === childId.toString();

            if (isLeft) {
                parent.leftTeamPV = (parent.leftTeamPV || 0) + pkg.pv;
                if (parent.leftColor) {
                    parent.leftColor.bv = (parent.leftColor.bv || 0) + pkg.bv;
                    parent.leftColor.pv = (parent.leftColor.pv || 0) + pkg.pv;
                }
            } else if (isRight) {
                parent.rightTeamPV = (parent.rightTeamPV || 0) + pkg.pv;
                if (parent.rightColor) {
                    parent.rightColor.bv = (parent.rightColor.bv || 0) + pkg.bv;
                    parent.rightColor.pv = (parent.rightColor.pv || 0) + pkg.pv;
                }
            }

            await parent.save();

            // Sync BinaryTree collection
            if (isLeft || isRight) {
                await BinaryTree.findOneAndUpdate(
                    { userId: parent._id },
                    {
                        $inc: {
                            [isLeft ? "leftPV" : "rightPV"]: pkg.pv,
                            [isLeft ? "leftBV" : "rightBV"]: pkg.bv,
                        }
                    },
                    { upsert: true }
                );
            }

            childId = parent._id;
            currentParentId = parent.parentId;
        }

        // ── 7. IncomeHistory - self activation record ─────────────────────────
        await IncomeHistory.create({
            userId: user._id,
            fromUserId: user._id,
            amount: pkg.price,
            type: "Direct",
            description: `${pkg.name} package activated - ₹${pkg.price}`,
        });

        return res.json({
            success: true,
            message: `${pkg.name} package successfully activated!`,
            data: {
                packageType,
                packageName: pkg.name,
                bv: pkg.bv,
                pv: pkg.pv,
                dailyCapping: pkg.capping,
                walletBalance: user.walletBalance,
            },
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * GET /api/package/status
 * Returns current user's package status
 */
exports.getPackageStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select(
            "packageType activeStatus bv pv dailyCapping walletBalance"
        );
        const pkg = PACKAGES[user.packageType] || null;

        return res.json({
            success: true,
            data: {
                packageType: user.packageType,
                packageName: pkg?.name || "None",
                activeStatus: user.activeStatus,
                bv: user.bv,
                pv: user.pv,
                dailyCapping: user.dailyCapping,
                walletBalance: user.walletBalance,
                packages: PACKAGES,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
