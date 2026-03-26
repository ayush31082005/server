const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const IncomeHistory = require('../models/IncomeHistory');

// Initialize Razorpay lazily to prevent server crash if keys are missing
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
    console.warn("[PAYMENT] Razorpay keys are missing in Wallettopupcontroller. Topup functionality will use mock mode.");
}

const isMocking = () =>
    !process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_here';

const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const Deduction = require('../models/Deduction');

exports.createTopupOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum top-up amount ₹100 hai.' });
        }
        if (amount > 50000) {
            return res.status(400).json({ success: false, message: 'Maximum top-up amount ₹50,000 hai.' });
        }

        let order;
        if (isMocking()) {
            order = {
                id: `order_mock_${Date.now()}`,
                amount: amount * 100,
                currency: 'INR',
                receipt: `topup_${Date.now()}`,
                status: 'created',
            };
        } else {
            // Receipt ID max length is 40 chars.
            order = await razorpay.orders.create({
                amount: amount * 100,
                currency: 'INR',
                receipt: `${req.user._id}_${Date.now()}`,
                notes: { userId: req.user._id.toString(), purpose: 'wallet_topup' },
            });
        }

        return res.json({
            success: true,
            order,
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_here',
            user: {
                name: req.user.userName || 'User',
                email: req.user.email,
                mobile: req.user.mobile || '',
            },
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Order create karne mein error aaya.'
        });
    }
};

/**
 * POST /api/wallet/topup/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }
 */
exports.verifyTopup = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Invalid amount.' });
        }

        // Signature verify
        let isAuthentic = false;
        if (isMocking()) {
            isAuthentic = true;
        } else {
            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSig = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body)
                .digest('hex');
            isAuthentic = expectedSig === razorpay_signature;
        }

        if (!isAuthentic) {
            return res.status(400).json({ success: false, message: 'Payment verification failed. Fraudulent request.' });
        }

        // Credit wallet
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        user.walletBalance = (user.walletBalance || 0) + Number(amount);
        await user.save();

        // Record in IncomeHistory as "Direct" (credit entry)
        await IncomeHistory.create({
            userId: user._id,
            fromUserId: user._id,
            amount: Number(amount),
            type: 'Direct',
            description: `Wallet top-up via Razorpay — ₹${amount} (Txn: ${razorpay_payment_id || 'mock'})`,
        });

        return res.json({
            success: true,
            message: `₹${Number(amount).toLocaleString('en-IN')} wallet mein credit ho gaye!`,
            walletBalance: user.walletBalance,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Payment verify karne mein error aaya.' });
    }
};

/**
 * GET /api/wallet/topup/balance
 */
exports.getWalletBalance = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('walletBalance userName memberId');
        
        // Calculate total deposits (all income history where this user is the recipient)
        const allIncomes = await IncomeHistory.find({ userId });
        const totalDeposits = allIncomes.reduce((sum, inc) => sum + inc.amount, 0);

        // Calculate total outflows:
        // 1. Withdrawal Requests (Gross amount = net + deductions if we had requested amount, but let's sum what we have)
        const allWithdrawals = await Withdrawal.find({ userId });
        const totalWdl = allWithdrawals.reduce((sum, wd) => sum + wd.amount, 0);

        // 2. Successful Recharges/Transactions
        const allTxs = await Transaction.find({ userId, status: 'success' });
        const totalTxs = allTxs.reduce((sum, tx) => sum + tx.amount, 0);

        // 3. Deductions (TDS/Admin/Fees)
        const allDeductions = await Deduction.find({ userId });
        const totalDed = allDeductions.reduce((sum, d) => sum + d.amount, 0);

        const totalOutflow = totalWdl + totalTxs + totalDed;

        return res.json({ 
            success: true, 
            walletBalance: user.walletBalance || 0,
            totalDeposits,
            totalWithdrawals: totalOutflow, // Return combined outflow as "Total Withdrawals" for the UI
            details: {
                withdrawals: totalWdl,
                recharges: totalTxs,
                deductions: totalDed
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};
