const mongoose = require('mongoose');

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
