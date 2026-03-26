const mongoose = require('mongoose');
const User = require('../models/User');
const IncomeHistory = require('../models/IncomeHistory');
const Rank = require('../models/Rank');
const Repurchase = require('../models/Repurchase');
const BinaryTree = require('../models/BinaryTree');
const Order = require('../models/Order');

exports.calculateDailyMatchingBonus = async () => {
    try {
        const users = await User.find({ activeStatus: true, packageType: { $ne: "none" } });

        for (const user of users) {
            // Find minimum PV available for matching
            const matchPV = Math.min(user.leftTeamPV, user.rightTeamPV);

            if (matchPV >= 0.25) {
                // Number of 0.25 PV units to match
                const matchUnits = Math.floor(matchPV / 0.25);
                const totalMatchingIncome = matchUnits * 100;

                // Respect daily capping
                let finalIncome = totalMatchingIncome;
                if (user.dailyCapping > 0 && finalIncome > user.dailyCapping) {
                    finalIncome = user.dailyCapping;
                }

                if (finalIncome > 0) {
                    user.walletBalance += finalIncome;
                    user.totalMatchingBonus += finalIncome;
                    user.matchedPV += (matchUnits * 0.25); // Cumulative for ranks

                    user.leftTeamPV -= (matchUnits * 0.25);
                    user.rightTeamPV -= (matchUnits * 0.25);

                    await user.save();

                    // ✅ SYNC: Deduct matched PV/BV from BinaryTree collection to update Dashboard
                    await BinaryTree.findOneAndUpdate(
                        { userId: user._id },
                        {
                            $inc: {
                                leftPV: -(matchUnits * 0.25),
                                rightPV: -(matchUnits * 0.25),
                                leftBV: -(matchUnits * 250), // 1 unit (0.25 PV) = 250 BV
                                rightBV: -(matchUnits * 250),
                                matchedPV: (matchUnits * 0.25)
                            }
                        }
                    );

                    await IncomeHistory.create({
                        userId: user._id,
                        amount: finalIncome,
                        type: 'Matching',
                        description: `Daily matching bonus for ${matchUnits * 0.25} PV match`
                    });

                    // Check for rank upgrades after matching
                    await this.checkAndUpgradeRank(user);
                }
            }
        }
    } catch (error) {
        // Handle error silently or pass to error middleware
    }
};

/**
 * Force updates ranks for all active users.
 */
exports.updateAllRanks = async () => {
    try {
        const users = await User.find({ activeStatus: true, packageType: { $ne: "none" } });
        for (const user of users) {
            await this.checkAndUpgradeRank(user);
        }
        for (const user of users) {
            await this.checkAndUpgradeRank(user);
        }
    } catch (error) {
        throw error;
    }
};

const RANKS = [
    { name: "Bronze", pv: 5, reward: "Bronze Badge + Company Catalog" },
    { name: "Silver", pv: 25, reward: "₹1200" },
    { name: "Gold", pv: 50, reward: "₹2500" },
    { name: "Platinum", pv: 100, reward: "₹5000 + NT" },
    { name: "Star", pv: 200, reward: "₹10000 + NT" },
    { name: "Ruby", pv: 500, reward: "₹50000" },
    { name: "Sapphire", pv: 1000, reward: "₹100000 + India Trip" },
    { name: "Star Sapphire", pv: 2500, reward: "₹500000 + India Trip Couple" },
    { name: "Emerald", pv: 6000, reward: "₹700000" },
    { name: "Diamond", pv: 30000, reward: "₹1000000" },
    { name: "Double Diamond", pv: 70000, reward: "₹1500000" },
    { name: "Blue Diamond", pv: 125000, reward: "₹30 Lakh" },
    { name: "Ambassador", pv: 300000, reward: "₹1cr ₹" },
    { name: "Crown", pv: 700000, reward: "₹2.5cr ₹" },
    { name: "MD", pv: 1500000, reward: "₹5cr ₹" }
];

/**
 * Checks if user is eligible for a rank upgrade based on matched PV.
 */
exports.checkAndUpgradeRank = async (user) => {
    try {
        // Current matched PV is stored in user.matchedPV
        const eligibleRanks = RANKS.filter(r => user.matchedPV >= r.pv);

        for (const rank of eligibleRanks) {
            // Check if user already has this rank
            const existingRank = await Rank.findOne({ userId: user._id, rankName: rank.name });
            if (!existingRank) {
                await Rank.create({
                    userId: user._id,
                    rankName: rank.name,
                    reward: rank.reward
                });

                // Update rank in user object
                user.rank = rank.name;
                await user.save();
            }
        }
    } catch (error) {
    }
};

/**
 * Distributes profit sharing bonus (4% of total turnover).
 * Proportional to user's PV contribution.
 */
exports.distributeProfitSharing = async (totalTurnover) => {
    try {
        const bonusPool = totalTurnover * 0.04;
        const activeUsers = await User.find({ activeStatus: true, packageType: { $ne: "none" } });
        const totalSystemPV = activeUsers.reduce((sum, u) => sum + (u.pv || 0), 0);

        if (totalSystemPV === 0) return;

        for (const user of activeUsers) {
            const userShare = (user.pv / totalSystemPV) * bonusPool;
            if (userShare > 0) {
                user.walletBalance += userShare;
                await user.save();

                await IncomeHistory.create({
                    userId: user._id,
                    amount: userShare,
                    type: 'ProfitSharing',
                    description: `Profit sharing bonus from turnover pool`
                });
            }
        }
    } catch (error) {
    }
};

/**
 * Gets comprehensive MLM statistics for the logged-in user.
 */
exports.getMLMStats = async (req, res) => {
    try {
        console.log("Fetching MLM stats for user:", req.user._id);
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch BinaryTree record for cached tree data
        let tree = await BinaryTree.findOne({ userId: user._id });

        if (!tree) {
            const totalLeft = await exports.countDownline(user.left);
            const totalRight = await exports.countDownline(user.right);

            const sponsorObj = await User.findOne({
                memberId: (user.sponsorId || "").toUpperCase()
            });

            tree = await BinaryTree.create({
                userId: user._id,
                parentId: user.parentId,
                sponsorId: sponsorObj?._id,
                position: user.position || "Left",
                totalLeft,
                totalRight,
                leftPV: user.leftTeamPV || 0,
                rightPV: user.rightTeamPV || 0
            }).catch(err => {
                return null;
            });
        }
        console.log("BinaryTree record available:", tree ? "Yes" : "No");

        // Optimized calculation for total product purchases and order count using aggregate
        const userId = new mongoose.Types.ObjectId(user._id);
        const purchaseAggregate = await Order.aggregate([
            { $match: { user: userId, status: { $ne: "cancelled" } } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$total" },
                    orderCount: { $sum: 1 }
                }
            }
        ]);
        const productPurchases = purchaseAggregate[0]?.totalSales || 0;
        const totalOrders = purchaseAggregate[0]?.orderCount || 0;

        // Direct count is already indexed
        const directCount = await User.countDocuments({ sponsorId: user.memberId });

        const stats = {
            walletBalance: Number(user.walletBalance || 0),
            pv: Number(user.pv || 0),
            bv: Number(user.bv || 0),
            totalGenerationIncome: Number(user.totalGenerationIncome || 0),
            matchedPV: Number(user.matchedPV || 0),
            rank: user.rank || "Member",
            productPurchases: Number(productPurchases || 0),
            totalOrders: Number(totalOrders || 0),
            dailyPV: {
                current: Number(user.dailyPV || 0),
                target: 320
            },
            lifetimePV: {
                current: Number(user.pv || 0),
                target: 10200
            }
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * Helper to count total downline recursively.
 */
exports.countDownline = async (rootId) => {
    if (!rootId) return 0;
    let count = 0;
    let queue = [rootId];
    while (queue.length > 0) {
        let currentId = queue.shift();
        let current = await User.findById(currentId);
        if (current) {
            count++;
            if (current.left) queue.push(current.left);
            if (current.right) queue.push(current.right);
        }
    }
    return count;
};

/**
 * Handles monthly repurchase and calculates generation income.
 * Generation income is distributed up to 20 levels.
 */
exports.handleRepurchase = async (userId, amount, bv) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // Record repurchase
        await Repurchase.create({
            userId,
            amount,
            bv
        });

        // Distribute Generation Income up to 20 levels
        let currentParentId = user.parent;
        let generation = 1;

        const genRates = {
            1: 0.10, 2: 0.08, 3: 0.05, 4: 0.03, 5: 0.02,
            6: 0.01, 7: 0.01, 8: 0.01, 9: 0.01, 10: 0.01,
            11: 0.005, 12: 0.005, 13: 0.005, 14: 0.005, 15: 0.005,
            16: 0.005, 17: 0.005, 18: 0.005, 19: 0.005, 20: 0.005
        };

        while (currentParentId && generation <= 20) {
            const parent = await User.findById(currentParentId);
            if (!parent) break;

            const incomeAmount = bv * (genRates[generation] || 0.005);

            if (incomeAmount > 0) {
                parent.walletBalance += incomeAmount;
                parent.totalGenerationIncome = (parent.totalGenerationIncome || 0) + incomeAmount;
                await parent.save();

                await IncomeHistory.create({
                    userId: parent._id,
                    amount: incomeAmount,
                    type: 'Generation',
                    fromUserId: user._id,
                    level: generation,
                    description: `Generation ${generation} income from ${user.memberId} repurchase`
                });
            }
            currentParentId = parent.parent;
            generation++;
        }
    } catch (error) {
    }
};

