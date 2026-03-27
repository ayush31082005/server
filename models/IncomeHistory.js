const mongoose = require('mongoose');

<<<<<<< HEAD
const incomeHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    // ✅ FIX 2: 'Repurchase' type add kiya enum mein
    type: {
        type: String,
        enum: ['Direct', 'Level', 'Matching', 'ProfitSharing', 'Generation', 'Repurchase'],
        required: true
    },
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    level: {
        type: Number
    },
    description: {
        type: String
    }
}, { timestamps: true });
=======
const incomeHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: [
                'Direct',
                'Level',
                'Matching',
                'ProfitSharing',
                'Generation',
                'Repurchase',
                'RechargeReward'
            ],
            required: true
        },
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        level: {
            type: Number
        },
        description: {
            type: String
        }
    },
    { timestamps: true }
);
>>>>>>> 093b684 (initial server commit)

incomeHistorySchema.index({ userId: 1 });
incomeHistorySchema.index({ type: 1 });
incomeHistorySchema.index({ createdAt: -1 });

<<<<<<< HEAD
module.exports = mongoose.model('IncomeHistory', incomeHistorySchema);
=======
module.exports = mongoose.model('IncomeHistory', incomeHistorySchema);
>>>>>>> 093b684 (initial server commit)
