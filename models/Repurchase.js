const mongoose = require('mongoose');

const repurchaseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // ✅ FIX 1: orderId add kiya - orderController se link hoga
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    bv: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

repurchaseSchema.index({ userId: 1 });
repurchaseSchema.index({ orderId: 1 });

module.exports = mongoose.model('Repurchase', repurchaseSchema);
