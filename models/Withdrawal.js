const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referenceNo: {
        type: String,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        enum: ['Bank Transfer', 'UPI'],
        required: true
    },
    // Bank Transfer details
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    // UPI details
    upiId: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    processedDate: { type: Date },
    adminNote: { type: String }
}, { timestamps: true });

// Auto-generate referenceNo before save
withdrawalSchema.pre('save', async function (next) {
    if (!this.referenceNo) {
        const count = await mongoose.model('Withdrawal').countDocuments();
        const month = new Date().toLocaleString('en', { month: 'short' }).toUpperCase();
        const year = new Date().getFullYear();
        this.referenceNo = `WDL/${String(count + 1).padStart(3, '0')}/${year}`;
    }
    next();
});

withdrawalSchema.index({ userId: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
