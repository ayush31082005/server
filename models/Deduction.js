const mongoose = require('mongoose');

const deductionSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['Tax', 'Fee', 'Admin'],
        required: true
    },
    // Tax = TDS/Service Tax, Fee = Processing Fee, Admin = Admin Charges
    description: { type: String },
    relatedWithdrawalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Withdrawal'
    },
    status: {
        type: String,
        enum: ['Processed', 'Pending'],
        default: 'Processed'
    }
}, { timestamps: true });

deductionSchema.pre('save', async function (next) {
    if (!this.referenceNo) {
        const count = await mongoose.model('Deduction').countDocuments();
        const month = new Date().toLocaleString('en', { month: 'short' }).toUpperCase();
        const year = new Date().getFullYear();
        this.referenceNo = `${this.type.toUpperCase().slice(0, 3)}/${month}/${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

deductionSchema.index({ userId: 1 });
deductionSchema.index({ type: 1 });
deductionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Deduction', deductionSchema);
