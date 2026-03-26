const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Deduction = require('../models/Deduction');
const IncomeHistory = require('../models/IncomeHistory');
const Transaction = require('../models/Transaction');

exports.getDeductionReport = async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'thisMonth', type = 'All Types', search = '' } = req.query;

        // Date filter
        let dateFilter = {};
        const now = new Date();
        if (period === 'thisMonth') {
            dateFilter = {
                createdAt: {
                    $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                    $lte: now
                }
            };
        } else if (period === 'lastMonth') {
            dateFilter = {
                createdAt: {
                    $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                    $lte: new Date(now.getFullYear(), now.getMonth(), 0)
                }
            };
        } else if (period === 'last3Months') {
            dateFilter = {
                createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 3)) }
            };
        }

        // Type filter
        let typeFilter = {};
        if (type && type !== 'All Types') {
            typeFilter = { type };
        }

        // Search filter
        let searchFilter = {};
        if (search) {
            searchFilter = {
                referenceNo: { $regex: search, $options: 'i' }
            };
        }

        const query = {
            userId,
            ...dateFilter,
            ...typeFilter,
            ...searchFilter
        };

        const deductions = await Deduction.find(query).sort({ createdAt: -1 });

        // Summary stats
        const allDeductions = await Deduction.find({ userId });
        const totalDeductions = allDeductions.reduce((sum, d) => sum + d.amount, 0);
        const taxDeductions = allDeductions
            .filter(d => d.type === 'Tax')
            .reduce((sum, d) => sum + d.amount, 0);
        const feeDeductions = allDeductions
            .filter(d => d.type === 'Fee')
            .reduce((sum, d) => sum + d.amount, 0);
        const adminDeductions = allDeductions
            .filter(d => d.type === 'Admin')
            .reduce((sum, d) => sum + d.amount, 0);
        const pendingDeductions = allDeductions
            .filter(d => d.status === 'Pending')
            .reduce((sum, d) => sum + d.amount, 0);

        res.json({
            success: true,
            summary: {
                totalDeductions,
                taxDeductions,
                feeDeductions,
                adminDeductions,
                pendingDeductions
            },
            deductions
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getWithdrawalHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status = '', method = '', period = '' } = req.query;

        let query = { userId };


        if (status && status !== 'All Status') query.status = status;
        if (method && method !== 'All Methods') query.method = method;

        if (period && period !== 'All Time') {
            const now = new Date();
            if (period === 'This Month') {
                query.createdAt = {
                    $gte: new Date(now.getFullYear(), now.getMonth(), 1)
                };
            } else if (period === 'Last Month') {
                query.createdAt = {
                    $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                    $lte: new Date(now.getFullYear(), now.getMonth(), 0)
                };
            }
        }

        const withdrawals = await Withdrawal.find(query).sort({ createdAt: -1 });

        // Summary
        const allWithdrawals = await Withdrawal.find({ userId });
        const totalWithdrawn = allWithdrawals.reduce((s, w) => s + w.amount, 0);
        const successful = allWithdrawals
            .filter(w => w.status === 'Completed')
            .reduce((s, w) => s + w.amount, 0);
        const pending = allWithdrawals
            .filter(w => w.status === 'Pending')
            .reduce((s, w) => s + w.amount, 0);
        const count = allWithdrawals.length;
        const avgWithdrawal = count > 0 ? Math.round(totalWithdrawn / count) : 0;

        res.json({
            success: true,
            summary: {
                totalWithdrawn,
                successful,
                pending,
                count,
                avgWithdrawal
            },
            withdrawals
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, method, accountNumber, ifscCode, bankName, upiId } = req.body;

        if (!amount || isNaN(amount) || amount < 500) {
            return res.status(400).json({
                success: false,
                message: 'Minimum withdrawal amount is ₹500'
            });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.walletBalance < amount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. You have ₹${user.walletBalance}`
            });
        }

        // TDS deduction (5%) + Processing fee (2%)
        const tdsAmount = Math.round(amount * 0.05);
        const processingFee = Math.round(amount * 0.02);
        const netAmount = amount - tdsAmount - processingFee;

        // Deduct from wallet
        user.walletBalance -= amount;
        await user.save();

        let withdrawal;
        try {
            // Create withdrawal record
            withdrawal = await Withdrawal.create({
                userId,
                amount: netAmount,
                method,
                accountNumber,
                ifscCode,
                bankName,
                upiId
            });

            // Create TDS deduction record
            await Deduction.create({
                userId,
                type: 'Tax',
                amount: tdsAmount,
                description: 'Tax Deducted at Source (TDS)',
                relatedWithdrawalId: withdrawal._id,
                status: 'Processed'
            });

            // Create processing fee record
            await Deduction.create({
                userId,
                type: 'Fee',
                amount: processingFee,
                description: 'Processing Fee - Withdrawal',
                relatedWithdrawalId: withdrawal._id,
                status: 'Processed'
            });
        } catch (dbErr) {
            // Error handling for DB records
        }

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            withdrawal: withdrawal || { amount: netAmount, referenceNo: 'PENDING' },
            deductions: { tds: tdsAmount, processingFee }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error during withdrawal' });
    }
};

exports.getRecentTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 5;

        // Fetch recent records from multiple sources
        const [incomes, withdrawals, deductions, otherTx] = await Promise.all([
            IncomeHistory.find({ userId }).sort({ createdAt: -1 }).limit(limit),
            Withdrawal.find({ userId }).sort({ createdAt: -1 }).limit(limit),
            Deduction.find({ userId }).sort({ createdAt: -1 }).limit(limit),
            Transaction.find({ userId, status: 'success' }).sort({ createdAt: -1 }).limit(limit)
        ]);

        // Merge and format
        const merged = [
            ...incomes.map(i => ({
                id: i._id,
                date: i.createdAt,
                type: 'credit',
                description: i.description || i.type,
                amount: i.amount
            })),
            ...withdrawals.map(w => ({
                id: w._id,
                date: w.createdAt,
                type: 'debit',
                description: `Withdrawal (${w.method})`,
                amount: w.amount
            })),
            ...otherTx.map(t => ({
                id: t._id,
                date: t.createdAt,
                type: 'debit',
                description: `${t.type.toUpperCase()} Recharge`,
                amount: t.amount
            }))
        ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        res.json({
            success: true,
            transactions: merged
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { search = '' } = req.query;

        // Income history (credits)
        const incomeQuery = { userId };
        if (search) {
            incomeQuery.$or = [
                { type: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const incomes = await IncomeHistory.find(incomeQuery)
            .populate('fromUserId', 'userName memberId')
            .sort({ createdAt: -1 });

        // Other Payments/Recharges & Withdrawals (debits)
        const [withdrawals, otherTransactions] = await Promise.all([
            Withdrawal.find({ userId }).sort({ createdAt: -1 }),
            Transaction.find({ userId, status: 'success' }).sort({ createdAt: -1 })
        ]);

        // Merge & sort by date
        const transactions = [
            ...incomes.map(i => ({
                _id: i._id,
                date: i.createdAt,
                type: i.type,
                amount: i.amount,
                source: i.fromUserId
                    ? `From: ${i.fromUserId.userName || i.fromUserId.memberId}`
                    : i.description || i.type,
                details: i.description || '',
                txType: 'credit'
            })),
            ...withdrawals.map(w => ({
                _id: w._id,
                date: w.createdAt,
                type: 'Withdrawal',
                amount: w.amount,
                source: w.method,
                details: w.referenceNo,
                txType: 'debit'
            })),
            ...otherTransactions.map(t => ({
                _id: t._id,
                date: t.createdAt,
                type: t.type.toUpperCase(),
                amount: t.amount,
                source: t.type === 'donation' ? 'Sanyukt Parivaar' : `${t.operator} - ${t.paymentMethod}`,
                details: t.type === 'donation' ? `Contribution (${t.paymentMethod})` : `${t.rechargeNumber} (${t.status})`,
                txType: 'debit'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            totalRecords: transactions.length,
            transactions
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getDailyClosingReport = async (req, res) => {
    try {
        const userId = req.user._id;
        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Previous day closing = today's opening
        const prevDay = new Date(startOfDay);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStart = new Date(prevDay);
        prevDayStart.setHours(0, 0, 0, 0);
        const prevDayEnd = new Date(prevDay);
        prevDayEnd.setHours(23, 59, 59, 999);

        // Credits for the day
        const dayIncomes = await IncomeHistory.find({
            userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        const totalCredits = dayIncomes.reduce((s, i) => s + i.amount, 0);

        // Debits for the day (withdrawals + deductions)
        const dayWithdrawals = await Withdrawal.find({
            userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        const dayDeductions = await Deduction.find({
            userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        const totalDebits =
            dayWithdrawals.reduce((s, w) => s + w.amount, 0) +
            dayDeductions.reduce((s, d) => s + d.amount, 0);

        // Current wallet balance
        const user = await User.findById(userId).select('walletBalance');
        const closingBalance = user.walletBalance;
        const openingBalance = closingBalance - totalCredits + totalDebits;

        res.json({
            success: true,
            date: targetDate,
            openingBalance: Math.max(0, openingBalance),
            closingBalance,
            totalCredits,
            totalDebits
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateWithdrawalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        if (!['Approved', 'Completed', 'Rejected', 'Pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

        withdrawal.status = status;
        if (adminNote) withdrawal.adminNote = adminNote;
        if (status === 'Completed') withdrawal.processedDate = new Date();

        await withdrawal.save();

        res.json({
            success: true,
            message: `Withdrawal status updated to ${status}`,
            withdrawal
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
