// ─── Wallet Top-Up Routes ─────────────────────────────────────────────────────
// In walletRoutes.js, add these 3 lines (require + routes):
//
//   const { createTopupOrder, verifyTopup, getWalletBalance } = require('../controllers/walletTopupController');
//
//   router.get('/topup/balance',        protect, getWalletBalance);
//   router.post('/topup/create-order',  protect, createTopupOrder);
//   router.post('/topup/verify',        protect, verifyTopup);
//
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getDeductionReport,
    getWithdrawalHistory,
    requestWithdrawal,
    getAllTransactions,
    getDailyClosingReport,
    getRecentTransactions,
    updateWithdrawalStatus,
} = require('../controllers/walletController');

const {
    createTopupOrder,
    verifyTopup,
    getWalletBalance,
} = require('../controllers/Wallettopupcontroller');

// Existing routes
router.get('/deduction-report', protect, getDeductionReport);
router.get('/withdrawal-history', protect, getWithdrawalHistory);
router.post('/withdraw', protect, requestWithdrawal);
router.get('/all-transactions', protect, getAllTransactions);
router.get('/daily-closing', protect, getDailyClosingReport);
router.get('/recent-transactions', protect, getRecentTransactions);
router.patch('/withdrawal/:id/status', protect, updateWithdrawalStatus);

// ── NEW: Wallet Top-Up ────────────────────────────────────────────────────────
router.get('/topup/balance', protect, getWalletBalance);
router.post('/topup/create-order', protect, createTopupOrder);
router.post('/topup/verify', protect, verifyTopup);


module.exports = router;

