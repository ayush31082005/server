const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { createOrder, verifyPayment, getUserTransactions, walletRecharge } = require('../controllers/rechargeController');
=======

const {
    createOrder,
    verifyPayment,
    getUserTransactions,
    walletRecharge,
    inspayRecharge
} = require('../controllers/rechargeController');

>>>>>>> 093b684 (initial server commit)
const { protect } = require('../middleware/authMiddleware');

router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);
router.post('/wallet', protect, walletRecharge);
router.get('/my-transactions', protect, getUserTransactions);

<<<<<<< HEAD
module.exports = router;
=======
// direct Inspay recharge
router.post('/', protect, inspayRecharge);

module.exports = router;
>>>>>>> 093b684 (initial server commit)
