const mongoose = require('mongoose');

<<<<<<< HEAD
const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined if payment fails before generating transaction id
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['mobile', 'dth', 'datacard', 'donation', 'recharge', 'payment'],
        required: true
    },
    operator: {
        type: String,
        required: true
    },
    rechargeNumber: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        default: 'razorpay'
    },
    razorpayOrderId: {
        type: String
    },
    razorpayPaymentId: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
=======
const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        transactionId: {
            type: String,
            unique: true,
            sparse: true
        },
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ['mobile', 'dth', 'datacard', 'donation', 'recharge', 'payment'],
            required: true
        },
        operator: {
            type: String,
            required: true
        },
        rechargeNumber: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'success', 'failed'],
            default: 'pending'
        },
        paymentMethod: {
            type: String,
            enum: ['wallet', 'razorpay', 'inspay'],
            default: 'razorpay'
        },
        razorpayOrderId: {
            type: String
        },
        razorpayPaymentId: {
            type: String
        }
    },
    { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ rechargeNumber: 1 });
transactionSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
>>>>>>> 093b684 (initial server commit)
