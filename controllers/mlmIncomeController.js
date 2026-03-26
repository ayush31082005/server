const User = require("../models/User");
const BinaryTree = require("../models/BinaryTree");
const IncomeHistory = require("../models/IncomeHistory");
const { PACKAGES } = require("../utils/mlmLogic");

/**
 * Calculate Daily Matching Bonus
 */
exports.calculateMatchingBonus = async () => {
    try {
        const trees = await BinaryTree.find({});
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        for (const tree of trees) {
            const user = await User.findById(tree.userId);
            if (!user || user.packageType === "none" || !user.activeStatus) continue;

            const packageInfo = PACKAGES[user.packageType];
            if (!packageInfo) continue;
            
            const cappingLimit = packageInfo.capping || 0;

            // 1. Check today's already earned matching income
            const todayEarned = await IncomeHistory.aggregate([
                {
                    $match: {
                        userId: user._id,
                        type: "Matching",
                        createdAt: { $gte: startOfDay }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" }
                    }
                }
            ]);

            const earnedAlready = todayEarned.length > 0 ? todayEarned[0].total : 0;
            const remainingCap = Math.max(0, cappingLimit - earnedAlready);

            if (remainingCap <= 0) {
                console.log(`User ${user.memberId} has already hit daily cap of ₹${cappingLimit}`);
                continue;
            }

            // 2. Calculate current matching available
            const leftAvailable = (tree.leftPV || 0) - (tree.matchedPV || 0);
            const rightAvailable = (tree.rightPV || 0) - (tree.matchedPV || 0);
            
            const matchingPV = Math.min(leftAvailable, rightAvailable);

            if (matchingPV >= 0.25) {
                // Calculate potential income: 0.25 PV = ₹100 -> ₹400 per 1 PV
                let potentialIncome = matchingPV * 400;
                
                // Enforce remaining daily capping
                let finalIncome = Math.min(potentialIncome, remainingCap);

                if (finalIncome > 0) {
                    user.walletBalance = (user.walletBalance || 0) + finalIncome;
                    user.totalMatchingBonus = (user.totalMatchingBonus || 0) + finalIncome;
                    await user.save();

                    // Even if we cap the income, we consider the PV "matched" 
                    // (Matching is based on PV, capping is based on income)
                    tree.matchedPV = (tree.matchedPV || 0) + matchingPV;
                    await tree.save();

                    await IncomeHistory.create({
                        userId: user._id,
                        fromUserId: user._id,
                        amount: finalIncome,
                        type: "Matching",
                        description: `Matching bonus for ${matchingPV} PV${finalIncome < potentialIncome ? ` (Capped from ₹${potentialIncome})` : ""}`
                    });

                    console.log(`✅ User ${user.memberId} earned ₹${finalIncome} matching bonus (Cap: ₹${cappingLimit})`);
                }
            }
        }
    } catch (error) {
        console.error("Error calculating matching bonus:", error);
    }
};

/**
 * Calculate Profit Sharing Bonus (4% of company turnover)
 * turnover: total amount from all joining packages today
 */
exports.calculateProfitSharing = async (dailyTurnover) => {
    try {
        const profitPool = dailyTurnover * 0.04;
        const activeUsers = await User.find({ activeStatus: true, pv: { $gt: 0 } });
        
        if (activeUsers.length === 0) return;

        const totalCompanyPV = activeUsers.reduce((sum, u) => sum + u.pv, 0);

        for (const user of activeUsers) {
            const share = (user.pv / totalCompanyPV) * profitPool;
            if (share > 0) {
                user.walletBalance += share;
                await user.save();

                await IncomeHistory.create({
                    userId: user._id,
                    fromUserId: user._id,
                    amount: share,
                    type: "Profit Sharing",
                    description: "Daily profit sharing bonus"
                });
            }
        }
    } catch (error) {
        console.error("Error calculating profit sharing:", error);
    }
};

/**
 * Update Rank and Reward System
 */
exports.updateRanks = async () => {
    const ranks = [
        { name: "Bronze", pv: 5, reward: 0 },
        { name: "Silver", pv: 25, reward: 1200 },
        { name: "Gold", pv: 50, reward: 2500 },
        { name: "Platinum", pv: 100, reward: 5000 },
        { name: "Star", pv: 200, reward: 10000 },
        { name: "Ruby", pv: 500, reward: 50000 },
        { name: "Sapphire", pv: 1000, reward: 100000 }, // + India Trip (handled manually or in notes)
        { name: "Star Sapphire", pv: 2500, reward: 500000 },
        { name: "Emerald", pv: 6000, reward: 700000 },
        { name: "Diamond", pv: 30000, reward: 1000000 },
        { name: "Double Diamond", pv: 70000, reward: 1500000 },
        { name: "Blue Diamond", pv: 125000, reward: 3000000 },
        { name: "Ambassador", pv: 300000, reward: 10000000 },
        { name: "Crown", pv: 700000, reward: 25000000 },
        { name: "MD", pv: 1500000, reward: 50000000 }
    ];

    try {
        const trees = await BinaryTree.find({});
        for (const tree of trees) {
            const matchedPV = tree.matchedPV;
            const user = await User.findById(tree.userId);
            if (!user) continue;

            let highestRank = null;
            for (const r of ranks) {
                if (matchedPV >= r.pv) {
                    highestRank = r;
                } else {
                    break;
                }
            }

            if (highestRank && user.rank !== highestRank.name) {
                // New rank achieved!
                user.rank = highestRank.name;
                if (highestRank.reward > 0) {
                    user.walletBalance += highestRank.reward;
                    await IncomeHistory.create({
                        userId: user._id,
                        fromUserId: user._id,
                        amount: highestRank.reward,
                        type: "Level", // Or a new "Reward" type
                        description: `Reward for achieving ${highestRank.name} rank`
                    });
                }
                await user.save();
            }
        }
    } catch (error) {
        console.error("Error updating ranks:", error);
    }
};
