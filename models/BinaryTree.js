const mongoose = require("mongoose");

const binaryTreeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            unique: true,
            required: true
        },
        sponsorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        leftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        rightId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        position: {
            type: String,
            enum: ["Left", "Right"],
            required: true
        },
        leftPV: { type: Number, default: 0 },
        rightPV: { type: Number, default: 0 },
        matchedPV: { type: Number, default: 0 }, // PV that has already been matched and paid
        leftCarryForward: { type: Number, default: 0 },
        rightCarryForward: { type: Number, default: 0 },
        leftBV: { type: Number, default: 0 },
        rightBV: { type: Number, default: 0 },
        totalLeft: { type: Number, default: 0 }, // Total users on left
        totalRight: { type: Number, default: 0 } // Total users on right
    },
    { timestamps: true }
);

// Add indexes for tree traversal
binaryTreeSchema.index({ parentId: 1 });
binaryTreeSchema.index({ leftId: 1 });
binaryTreeSchema.index({ rightId: 1 });
binaryTreeSchema.index({ sponsorId: 1 });

module.exports = mongoose.model("BinaryTree", binaryTreeSchema);
