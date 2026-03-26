const User = require("../models/User");
const BinaryTree = require("../models/BinaryTree");
const IncomeHistory = require("../models/IncomeHistory");

/**
 * Find the first available position in a binary tree subtree
 * @param {string} parentId - Starting parent ID
 * @param {string} position - "Left" or "Right"
 * @returns {Promise<Object>} - { parentId, position }
 */
const findPlacement = async (parentId, position) => {
    let current = await User.findById(parentId);
    if (!current) throw new Error("Parent not found");

    let queue = [current];
    
    // For the initial position from sponsor, we only look down that specific leg
    // If sponsor's Left is empty, return sponsor + Left.
    // If not, we need to find the first empty spot in that subtree.
    // Standard binary MLM: usually extreme left or extreme right of that leg.
    
    let target = position === "Left" ? current.left : current.right;
    
    if (!target) {
        return { parentId: current._id, position };
    }

    // Traverse down the selected leg to find the first available spot
    // To maintain a "power leg" or "extreme" placement:
    let tempParent = target;
    while (true) {
        let next = position === "Left" ? (await User.findById(tempParent)).left : (await User.findById(tempParent)).right;
        if (!next) {
            return { parentId: tempParent, position };
        }
        tempParent = next;
    }
};

/**
 * Distribute Direct Referral Income
 */
const distributeDirectIncome = async (sponsorId, newUserId, pvValue) => {
    if (pvValue < 0.5) return; // Requirement: 0.5 PV or higher

    const amount = 50;
    const sponsor = await User.findById(sponsorId);
    if (sponsor) {
        sponsor.walletBalance += amount;
        await sponsor.save();

        await IncomeHistory.create({
            userId: sponsorId,
            fromUserId: newUserId,
            amount: amount,
            type: "Direct",
            description: "Direct referral income"
        });
    }
};

/**
 * Distribute Level Income (20 Levels)
 */
const distributeLevelIncome = async (userId, newUserId) => {
    const levelAmounts = [50, 40, 30, 20, 10, 10, 5, 5, 5, 5, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2];
    
    let currentUser = await User.findById(userId);
    let parentId = currentUser ? currentUser.parent : null;

    for (let i = 0; i < levelAmounts.length; i++) {
        if (!parentId) break;

        const parent = await User.findById(parentId);
        if (!parent) break;

        const amount = levelAmounts[i];
        parent.walletBalance += amount;
        await parent.save();

        await IncomeHistory.create({
            userId: parent._id,
            fromUserId: newUserId,
            amount: amount,
            type: "Level",
            level: i + 1,
            description: `Level ${i + 1} income`
        });

        parentId = parent.parent;
    }
};

/**
 * Update PV/BV up the tree
 */
const updateTreePVBV = async (userId, pv, bv, position) => {
    let currentId = userId;
    let currentPos = position;

    // We start from the parent of the new user
    let user = await User.findById(userId);
    let parentId = user.parent;
    let childId = user._id;

    while (parentId) {
        const parent = await User.findById(parentId);
        if (!parent) break;

        // Determine if the child is on the left or right of this parent
        if (parent.left && parent.left.toString() === childId.toString()) {
            parent.leftColor.pv += pv;
            parent.leftColor.bv += bv;
        } else if (parent.right && parent.right.toString() === childId.toString()) {
            parent.rightColor.pv += pv;
            parent.rightColor.bv += bv;
        }

        await parent.save();
        
        // Update BinaryTree collection as well
        await BinaryTree.findOneAndUpdate(
            { userId: parent._id },
            { 
                $inc: { 
                    [parent.left && parent.left.toString() === childId.toString() ? "leftPV" : "rightPV"]: pv,
                    [parent.left && parent.left.toString() === childId.toString() ? "leftBV" : "rightBV"]: bv
                } 
            }
        );

        childId = parent._id;
        parentId = parent.parent;
    }
};

const PACKAGES = {
    "599": { bv: 250, pv: 0.25, capping: 2000 },
    "1299": { bv: 500, pv: 0.5, capping: 4000 },
    "2699": { bv: 1000, pv: 1, capping: 10000 }
};

module.exports = {
    findPlacement,
    distributeDirectIncome,
    distributeLevelIncome,
    updateTreePVBV,
    PACKAGES
};
