<<<<<<< HEAD
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const sendEmail = require('../utils/sendEmail');
const User = require('../models/User');
const IncomeHistory = require('../models/IncomeHistory');

// Initialize Razorpay lazily to prevent server crash if keys are missing
let razorpay;
=======
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');
const Razorpay = require('razorpay');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const IncomeHistory = require('../models/IncomeHistory');
const sendEmail = require('../utils/sendEmail');

// -----------------------------
// Razorpay init
// -----------------------------
let razorpay = null;

>>>>>>> 093b684 (initial server commit)
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} else {
<<<<<<< HEAD
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
=======
    console.warn('[PAYMENT] Razorpay keys are missing.');
}

// -----------------------------
// Helpers
// -----------------------------
const logInspayDebug = (data) => {
    try {
        const logPath = path.join(__dirname, '../inspay_debug.log');
        const timestamp = new Date().toISOString();

        const safe = { ...data };

        if (safe.payload?.token) {
            safe.payload.token = 'REDACTED';
        }

        if (typeof safe.response === 'string' && safe.response.length > 2000) {
            safe.response = `${safe.response.slice(0, 2000)}...[truncated]`;
        }

        const entry = `[${timestamp}] ${JSON.stringify(safe, null, 2)}\n\n---\n\n`;
        fs.appendFileSync(logPath, entry);
    } catch (err) {
        console.error('Failed to write inspay log:', err.message);
    }
};

const normalizeInspayUrl = (url) => {
    if (!url) return url;
    return url.replace('://www.', '://');
};

const isHtmlResponse = (data) => {
    return typeof data === 'string' && data.toLowerCase().includes('<html');
};

const mapOperatorToInspay = (opIdRaw) => {
    const opId = String(opIdRaw || '').toLowerCase();

    const mapping = {
        airtel: 'AT',
        jio: 'RJ',
        vi: 'VF',
        vodafone: 'VF',
        idea: 'VF',
        bsnl: 'BS',
        // DTH examples; change if your provider uses different codes
        tata_sky: 'TS',
        tatasky: 'TS',
        dish_tv: 'DT',
        dishtv: 'DT',
        d2h: 'VD',
        airtel_dth: 'AD',
        sun_direct: 'SD'
    };

    return mapping[opId] || String(opIdRaw || '').toUpperCase();
};

const getOperatorCandidates = (opIdRaw) => {
    const opId = String(opIdRaw || '').toLowerCase();

    const map = {
        airtel: ['AT', 'AIRTEL'],
        jio: ['RJ', 'JIO', 'JO'],
        vi: ['VF', 'VI', 'VODAFONE', 'IDEA'],
        vodafone: ['VF', 'VODAFONE'],
        idea: ['VF', 'IDEA'],
        bsnl: ['BS', 'BSNL'],

        tatasky: ['TS', 'TATASKY', 'TATA SKY'],
        tata_sky: ['TS', 'TATASKY', 'TATA SKY'],
        dish_tv: ['DT', 'DISHTV', 'DISH TV'],
        dishtv: ['DT', 'DISHTV', 'DISH TV'],
        d2h: ['VD', 'D2H', 'VIDEOCON D2H'],
        airtel_dth: ['AD', 'AIRTELDTH', 'AIRTEL DTH'],
        sun_direct: ['SD', 'SUNDIRECT', 'SUN DIRECT']
    };

    return map[opId] || [String(opIdRaw || '')];
};

const isInspaySuccess = (resp) => {
    if (!resp) return false;

    const status = String(resp.status || '').toLowerCase();
    const message = String(resp.message || '').toLowerCase();
    const opid = String(resp.opid || '').toLowerCase();
    const statusCode = String(resp.statuscode || resp.status_code || '').toLowerCase();

    return (
        status === 'success' ||
        status === 'pending' ||
        status === 'successful' ||
        message.includes('success') ||
        message.includes('pending') ||
        statusCode === 'txn' ||
        statusCode === 'txns' ||
        opid.includes('success')
    );
};

const creditRechargeReward = async (userId, amount, type, rechargeNumber) => {
    try {
        const rewardAmount = Number(amount) * 0.05;
        if (!rewardAmount || rewardAmount <= 0) return;

        const user = await User.findById(userId);
        if (!user) return;

        user.walletBalance = Number(user.walletBalance || 0) + rewardAmount;
        await user.save();

        await IncomeHistory.create({
            userId: user._id,
            amount: rewardAmount,
            type: 'RechargeReward',
            description: `5% reward for ${type} recharge of ₹${amount} for ${rechargeNumber}`
        });
    } catch (error) {
        console.error('Error crediting recharge reward:', error.message);
    }
};

const getRequestRechargeData = (body = {}) => {
    const rechargeNumber = body.rechargeNumber || body.mobile || body.number || '';
    return {
        amount: Number(body.amount),
        type: body.type || 'mobile',
        operator: body.operator,
        rechargeNumber: String(rechargeNumber || '').trim()
    };
};

// -----------------------------
// Create Razorpay Order
// POST /api/recharge/create-order
// -----------------------------
exports.createOrder = async (req, res) => {
    try {
        const { amount, type, operator, rechargeNumber } = getRequestRechargeData(req.body);

        if (!razorpay) {
            return res.status(503).json({
                success: false,
                message: 'Payment service is currently unavailable. Configure Razorpay keys.'
            });
        }

        if (!amount || amount <= 0 || !type || !operator || !rechargeNumber) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount or missing fields'
            });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `receipt_order_${Date.now()}`
        });

>>>>>>> 093b684 (initial server commit)
        const transaction = await Transaction.create({
            userId: req.user._id,
            amount,
            type,
            operator,
            rechargeNumber,
            status: 'pending',
<<<<<<< HEAD
            razorpayOrderId: order.id
        });

        res.status(200).json({
=======
            paymentMethod: 'razorpay',
            razorpayOrderId: order.id
        });

        return res.status(200).json({
>>>>>>> 093b684 (initial server commit)
            success: true,
            order,
            transactionId: transaction._id
        });
    } catch (error) {
<<<<<<< HEAD
        console.error("Create order error:", error);
        res.status(500).json({ message: "Server error", error: error.message || error.toString(), detailed: error });
    }
};

// @desc    Verify Razorpay payment signature
// @route   POST /api/recharge/verify-payment
// @access  Public
=======
        console.error('Create order error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// -----------------------------
// Verify Razorpay Payment
// POST /api/recharge/verify-payment
// -----------------------------
>>>>>>> 093b684 (initial server commit)
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            transactionId
        } = req.body;

<<<<<<< HEAD
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
=======
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification fields'
            });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            await Transaction.findByIdAndUpdate(transactionId, {
                status: 'failed',
                razorpayPaymentId: razorpay_payment_id
            });

            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        transaction.status = 'success';
        transaction.razorpayPaymentId = razorpay_payment_id;
        transaction.transactionId = `TXN_RZP_${Date.now()}`;
        await transaction.save();

        await creditRechargeReward(
            req.user._id,
            transaction.amount,
            transaction.type,
            transaction.rechargeNumber
        );

        const user = await User.findById(req.user._id);

        if (user?.email) {
            const subject = 'Recharge Successful - Sanyukt Parivaar';
            const text = `Dear ${user.userName || 'Member'},

Your ${transaction.type} recharge of Rs.${transaction.amount} for ${transaction.rechargeNumber} was successful.

Transaction Details:
Operator: ${transaction.operator}
Transaction ID: ${transaction.transactionId}
Date: ${new Date().toLocaleString()}

Thank you for choosing Sanyukt Parivaar!`;

            sendEmail(user.email, subject, text).catch((err) =>
                console.error('Email error:', err.message)
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            transaction
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// -----------------------------
// Wallet Recharge
// POST /api/recharge/wallet
// -----------------------------
exports.walletRecharge = async (req, res) => {
    try {
        const { amount, type, operator, rechargeNumber } = getRequestRechargeData(req.body);

        if (!amount || amount <= 0 || !type || !operator || !rechargeNumber) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
>>>>>>> 093b684 (initial server commit)
        }

        const user = await User.findById(req.user._id);
        if (!user) {
<<<<<<< HEAD
            return res.status(404).json({ message: "User not found" });
        }

        if (user.walletBalance < amount) {
            return res.status(400).json({ message: "Insufficient wallet balance" });
        }

        // Deduct balance
        user.walletBalance -= amount;
        await user.save();

        // Create transaction record
=======
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (Number(user.walletBalance || 0) < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        user.walletBalance = Number(user.walletBalance || 0) - amount;
        await user.save();

>>>>>>> 093b684 (initial server commit)
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

<<<<<<< HEAD
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
=======
        await creditRechargeReward(req.user._id, amount, type, rechargeNumber);

        if (user.email) {
            const subject = 'Recharge Successful - Sanyukt Parivaar';
            const text = `Dear ${user.userName || 'Member'},

Your ${type} recharge of Rs.${amount} for ${rechargeNumber} was successful using wallet balance.

Transaction Details:
Operator: ${operator}
Transaction ID: ${transaction.transactionId}
Date: ${new Date().toLocaleString()}

Thank you for choosing Sanyukt Parivaar!`;

            sendEmail(user.email, subject, text).catch((err) =>
                console.error('Email error:', err.message)
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Recharge successful using wallet balance',
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Wallet recharge error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// -----------------------------
// Get User Transactions
// GET /api/recharge/my-transactions
// -----------------------------
exports.getUserTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Fetch transactions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// -----------------------------
// Direct Inspay Recharge
// POST /api/recharge
// -----------------------------
exports.inspayRecharge = async (req, res) => {
    try {
        const mobile = req.body.mobile || req.body.rechargeNumber;
        const opId = req.body.operator;
        const amount = Number(req.body.amount);
        const type = req.body.type || 'mobile';
        const querystring = require('querystring');

        if (!mobile || !opId || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields or invalid amount"
            });
        }

        if (!/^\d{10}$/.test(String(mobile))) {
            return res.status(400).json({
                success: false,
                message: "Mobile number must be exactly 10 digits"
            });
        }

        // aage ka existing Inspay code same rahega
    } catch (error) {
        console.error("FINAL INSPAY ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};
>>>>>>> 093b684 (initial server commit)
