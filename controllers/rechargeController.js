const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const sendEmail = require('../utils/sendEmail');
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
    console.warn("[PAYMENT] Razorpay keys are missing. Recharge functionality will be disabled.");
}

// @desc    Create a new recharge order
// @route   POST /api/recharge/create-order
// @access  Public (Should be protected in production)
exports.createOrder = async (req, res) => {
    try {
        const { amount, type, operator, rechargeNumber } = req.body;

        if (!razorpay) {
            return res.status(503).json({ message: "Payment service is currently unavailable. Please configure Razorpay keys." });
        }

        if (!amount || !type || !operator || !rechargeNumber || Number(amount) <= 0) {
            return res.status(400).json({ message: "Invalid amount or missing fields" });
        }

        // Razorpay expects amount in paise (multiply by 100)
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(500).json({ message: "Failed to create order" });
        }

        // Save initial transaction state as pending
        const transaction = await Transaction.create({
            userId: req.user._id,
            amount,
            type,
            operator,
            rechargeNumber,
            status: 'pending',
            razorpayOrderId: order.id
        });

        res.status(200).json({
            success: true,
            order,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Server error", error: error.message || error.toString(), detailed: error });
    }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/recharge/verify-payment
// @access  Public
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            transactionId
        } = req.body;

        const secret = process.env.RAZORPAY_KEY_SECRET;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Update transaction status to success
            await Transaction.findByIdAndUpdate(transactionId, {
                status: 'success',
                razorpayPaymentId: razorpay_payment_id,
                transactionId: `TXN${Date.now()}` // Generate a unique TXN ID for your system
            });

            // Send Email notification
            const transaction = await Transaction.findById(transactionId);
            if (transaction) {
                const user = await User.findById(transaction.userId);
                if (user && user.email) {
                    const subject = `Recharge Successful - Sanyukt Parivaar`;
                    const text = `Dear ${user.userName || 'Member'},\n\nYour ${transaction.type} recharge of Rs.${transaction.amount} for ${transaction.rechargeNumber} was successful.\n\nTransaction Details:\nOperator: ${transaction.operator}\nTransaction ID: TXN${Date.now()}\nDate: ${new Date().toLocaleString()}\n\nThank you for choosing Sanyukt Parivaar!`;
                    sendEmail(user.email, subject, text).catch(err => console.error("Email error:", err));

                    // Credit 5% reward to user for recharges only (not donations)
                    if (transaction.type !== 'donation') {
                        await creditRechargeReward(user._id, transaction.amount, transaction.type, transaction.rechargeNumber);
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: "Payment verified successfully"
            });
        } else {
            // Update transaction status to failed
            await Transaction.findByIdAndUpdate(transactionId, {
                status: 'failed'
            });

            res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }
    } catch (error) {
        console.error("Verify payment error:", error);
        res.status(500).json({ message: "Server error", error: error.message, stack: error.stack });
    }
};

// @desc    Recharge using internal wallet balance
// @route   POST /api/recharge/wallet
// @access  Protected
exports.walletRecharge = async (req, res) => {
    try {
        const { amount, type, operator, rechargeNumber } = req.body;

        if (!amount || !type || !operator || !rechargeNumber || Number(amount) <= 0) {
            return res.status(400).json({ message: "Invalid amount or missing fields" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.walletBalance < amount) {
            return res.status(400).json({ message: "Insufficient wallet balance" });
        }

        // Deduct balance
        user.walletBalance -= amount;
        await user.save();

        // Create transaction record
        const transaction = await Transaction.create({
            userId: req.user._id,
            amount,
            type,
            operator,
            rechargeNumber,
            status: 'success',
            paymentMethod: 'wallet',
            transactionId: `TXN_WL_${Date.now()}`
        });

        // Send Email notification
        if (user && user.email) {
            const subject = `Recharge Successful - Sanyukt Parivaar`;
            const text = `Dear ${user.userName || 'Member'},\n\nYour ${type} recharge of Rs.${amount} for ${rechargeNumber} was successful using your wallet balance.\n\nTransaction Details:\nOperator: ${operator}\nTransaction ID: TXN_WL_${Date.now()}\nDate: ${new Date().toLocaleString()}\n\nThank you for choosing Sanyukt Parivaar!`;
            sendEmail(user.email, subject, text).catch(err => console.error("Email error:", err));
        }

        // Credit 5% reward to user
        await creditRechargeReward(req.user._id, amount, type, rechargeNumber);

        res.status(200).json({
            success: true,
            message: "Recharge successful using wallet balance",
            transactionId: transaction._id
        });
    } catch (error) {
        console.error("Wallet recharge error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// @desc    Get logged in user transactions
// @route   GET /api/recharge/my-transactions
// @access  Protected
exports.getUserTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        console.error("Fetch transactions error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Helper to credit 5% reward to user
const creditRechargeReward = async (userId, amount, type, rechargeNumber) => {
    try {
        const rewardAmount = amount * 0.05; // 5% reward
        if (rewardAmount <= 0) return;

        const user = await User.findById(userId);
        if (user) {
            user.walletBalance = (user.walletBalance || 0) + rewardAmount;
            await user.save();

            await IncomeHistory.create({
                userId: user._id,
                amount: rewardAmount,
                type: 'RechargeReward',
                description: `5% reward for ${type} recharge of ₹${amount} for ${rechargeNumber}`
            });
            console.log(`Recharge reward of ₹${rewardAmount} credited to user ${userId}`);
        }
    } catch (error) {
        console.error("Error crediting recharge reward:", error);
        console.error(error.stack);
    }
};
