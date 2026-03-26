const Repurchase = require("../models/Repurchase");
const RepurchaseLevelIncome = require("../models/RepurchaseLevelIncome");
const BinaryTree = require("../models/BinaryTree");
const User = require("../models/User");
const IncomeHistory = require("../models/IncomeHistory");

// ✅ FIX 3: Plan ke hisaab se sahi commission rates
// Gen 1: 15%, Gen 2: 10%, Gen 3: 5%, Gen 4-7: 2.5%, Gen 8-12: 1.25%, Gen 13-20: 0.75%
const REPURCHASE_GENERATION_CONFIG = [
    { gen: 1, percent: 15.00 },
    { gen: 2, percent: 10.00 },
    { gen: 3, percent: 5.00 },
    { gen: 4, percent: 2.50 },
    { gen: 5, percent: 2.50 },
    { gen: 6, percent: 2.50 },
    { gen: 7, percent: 2.50 },
    { gen: 8, percent: 1.25 },
    { gen: 9, percent: 1.25 },
    { gen: 10, percent: 1.25 },
    { gen: 11, percent: 1.25 },
    { gen: 12, percent: 1.25 },
    { gen: 13, percent: 0.75 },
    { gen: 14, percent: 0.75 },
    { gen: 15, percent: 0.75 },
    { gen: 16, percent: 0.75 },
    { gen: 17, percent: 0.75 },
    { gen: 18, percent: 0.75 },
    { gen: 19, percent: 0.75 },
    { gen: 20, percent: 0.75 },
];

const BV_PER_REPURCHASE = 300; // Plan ke hisaab se fixed

// ============================================================
// MAIN FUNCTION - Order hone par call hoga orderController se
// ============================================================
exports.processRepurchaseGenerationIncome = async (repurchaseId) => {
    try {
        const repurchase = await Repurchase.findById(repurchaseId);
        if (!repurchase) throw new Error("Repurchase not found");

        // ✅ FIX 4: User.parent use kar rahe hain (BinaryTree.parentId nahi)
        // Kyunki mlmController bhi user.parent se hi traverse karta hai
        const buyerUser = await User.findById(repurchase.userId);
        if (!buyerUser) throw new Error("Buyer user not found");

        // ✅ FIX 5: user.parent se upar traverse karo (User model ka field)
        let currentParentId = buyerUser.parent;
        let generation = 1;

        while (currentParentId && generation <= 20) {
            const parentUser = await User.findById(currentParentId);
            if (!parentUser) break;

            // Sirf active users ko income milegi
            if (parentUser.activeStatus) {
                const config = REPURCHASE_GENERATION_CONFIG[generation - 1];
                const commissionAmount = (BV_PER_REPURCHASE * config.percent) / 100;

                // Duplicate check - same repurchase + same generation + same user
                const alreadyProcessed = await RepurchaseLevelIncome.findOne({
                    repurchaseId: repurchase._id,
                    userId: parentUser._id,
                    generation: generation,
                });

                if (!alreadyProcessed) {
                    // ✅ RepurchaseLevelIncome record save karo
                    await RepurchaseLevelIncome.create({
                        userId: parentUser._id,
                        fromUserId: repurchase.userId,
                        repurchaseId: repurchase._id,
                        generation: generation,
                        bv: BV_PER_REPURCHASE,
                        commissionPercent: config.percent,
                        commissionAmount: commissionAmount,
                        status: "credited",
                    });

                    // ✅ Wallet + totalGenerationIncome update
                    await User.findByIdAndUpdate(parentUser._id, {
                        $inc: {
                            walletBalance: commissionAmount,
                            totalGenerationIncome: commissionAmount,
                        },
                    });

                    // ✅ FIX 6: IncomeHistory mein 'Repurchase' type use karo
                    await IncomeHistory.create({
                        userId: parentUser._id,
                        fromUserId: repurchase.userId,
                        amount: commissionAmount,
                        type: "Repurchase",  // IncomeHistory enum mein add kiya hai
                        level: generation,
                        description: `Generation ${generation} repurchase income (${config.percent}%) from ${buyerUser.memberId || buyerUser._id}`,
                    });

                    console.log(`✅ Gen ${generation} | ₹${commissionAmount} → ${parentUser.memberId || parentUser._id}`);
                }
            }

            // Agle parent ki taraf jao
            currentParentId = parentUser.parent;
            generation++;
        }

        console.log(`🎉 Repurchase Generation Income complete for repurchaseId: ${repurchaseId}`);
    } catch (error) {
        console.error("❌ processRepurchaseGenerationIncome Error:", error.message);
        throw error;
    }
};

// ============================================================
// GET - Frontend ke liye: User ki generation income summary
// ============================================================
exports.getRepurchaseLevelIncome = async (req, res) => {
    try {
        const userId = req.user._id;

        // Total income
        const totalResult = await RepurchaseLevelIncome.aggregate([
            { $match: { userId: userId, status: "credited" } },
            { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
        ]);

        // Active downline (unique members jinse income aayi)
        const activeDownline = await RepurchaseLevelIncome.distinct("fromUserId", {
            userId: userId,
        });

        // Generation-wise breakdown (frontend cards ke liye)
        const generationBreakdown = await RepurchaseLevelIncome.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: "$generation",
                    totalIncome: { $sum: "$commissionAmount" },
                    totalBV: { $sum: "$bv" },
                    memberCount: { $addToSet: "$fromUserId" },
                    commissionPercent: { $first: "$commissionPercent" },
                },
            },
            {
                $project: {
                    generation: "$_id",
                    totalIncome: 1,
                    totalBV: 1,
                    downlineMembers: { $size: "$memberCount" },
                    commissionPercent: 1,
                    _id: 0,
                },
            },
            { $sort: { generation: 1 } },
        ]);

        // Recent transactions (table ke liye)
        const recentTransactions = await RepurchaseLevelIncome.find({ userId })
            .populate("fromUserId", "name userName mobile memberId")
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            data: {
                totalLevelIncome: totalResult[0]?.total || 0,
                activeDownline: activeDownline.length,
                activeLevels: generationBreakdown.length,
                generationBreakdown,
                recentTransactions,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
