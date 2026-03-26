const User = require('../models/User');
const BinaryTree = require('../models/BinaryTree');
const IncomeHistory = require('../models/IncomeHistory');

exports.processOrderMLM = async (userId, bv, pv) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`MLM Order Process: User not found: ${userId}`);
            return;
        }

        // 1. Update buyer's personal stats
        user.bv = (user.bv || 0) + bv;
        user.pv = (user.pv || 0) + pv;
        await user.save();
        console.log(`MLM Order Process: Updated personal points for ${user.memberId}: BV+${bv}, PV+${pv}`);

        // 2. Update Upline Team PV/BV (Binary Tree)
        let currentId = user.parentId;
        let childId = user._id;

        while (currentId) {
            const parent = await User.findById(currentId);
            if (!parent) break;

            const isLeft = parent.left && parent.left.toString() === childId.toString();
            const isRight = parent.right && parent.right.toString() === childId.toString();

            if (isLeft) {
                parent.leftTeamPV = (parent.leftTeamPV || 0) + pv;
                if (parent.leftColor) {
                    parent.leftColor.bv = (parent.leftColor.bv || 0) + bv;
                    parent.leftColor.pv = (parent.leftColor.pv || 0) + pv;
                }
            } else if (isRight) {
                parent.rightTeamPV = (parent.rightTeamPV || 0) + pv;
                if (parent.rightColor) {
                    parent.rightColor.bv = (parent.rightColor.bv || 0) + bv;
                    parent.rightColor.pv = (parent.rightColor.pv || 0) + pv;
                }
            }

            await parent.save();

            // Also update BinaryTree collection for consistency
            if (isLeft || isRight) {
                await BinaryTree.findOneAndUpdate(
                    { userId: parent._id },
                    {
                        $inc: {
                            [isLeft ? "leftPV" : "rightPV"]: pv,
                            [isLeft ? "leftBV" : "rightBV"]: bv
                        }
                    },
                    { upsert: true } // Ensure record exists
                );
            }

            childId = parent._id;
            currentId = parent.parentId;
        }

        // 3. Distribute Generation Income (Generation Tree / Parent)
        // Note: In some systems, Generation tree follows the 'parent' (unilevel) 
        // while Binary tree follows 'parentId'. Here we'll use 'parent' field for generation income 
        // as seen in repurchaseController.js.

        const generationPercentages = [
            0.05, 0.04, 0.03, 0.02, 0.01, 0.01, 0.005, 0.005, 0.005, 0.005,
            0.004, 0.004, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.002, 0.002
        ];

        let genParentId = user.parent;
        for (let i = 0; i < generationPercentages.length; i++) {
            if (!genParentId) break;

            const genParent = await User.findById(genParentId);
            if (!genParent) break;

            const income = bv * generationPercentages[i];
            if (income > 0) {
                genParent.walletBalance = (genParent.walletBalance || 0) + income;
                genParent.totalGenerationIncome = (genParent.totalGenerationIncome || 0) + income;
                await genParent.save();

                await IncomeHistory.create({
                    userId: genParent._id,
                    fromUserId: user._id,
                    amount: income,
                    type: "Generation",
                    level: i + 1,
                    description: `Generation income from purchase by ${user.memberId} (Level ${i + 1})`
                });
            }

            genParentId = genParent.parent;
        }

        console.log(`MLM Order Process: Finished processing for user ${user.memberId}`);

    } catch (error) {
        console.error("MLM Order Process Error:", error);
    }
};
