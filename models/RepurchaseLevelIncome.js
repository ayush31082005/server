const mongoose = require("mongoose");

const repurchaseLevelIncomeSchema = new mongoose.Schema(
    {
        // Upline - jisko income mili
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // Downline - jisne repurchase kiya
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        repurchaseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Repurchase",
            required: true,
        },
        generation: {
            type: Number, // 1 to 20
            required: true,
        },
        bv: {
            type: Number,
            default: 300,
        },
        commissionPercent: {
            type: Number,
            required: true,
        },
        commissionAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "credited", "failed"],
            default: "credited",
        },
    },
    { timestamps: true }
);

repurchaseLevelIncomeSchema.index({ userId: 1 });
repurchaseLevelIncomeSchema.index({ repurchaseId: 1 });

module.exports = mongoose.model("RepurchaseLevelIncome", repurchaseLevelIncomeSchema);
