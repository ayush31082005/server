const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getUserStats,
    getProductStats,
    getOrderStats,
    getRecentActivity
} = require('../controllers/adminStatsController');

// All routes protected and admin-only
router.use(protect, adminOnly);

router.get('/stats/users', getUserStats);
router.get('/stats/products', getProductStats);
router.get('/stats/orders', getOrderStats);
router.get('/activity/recent', getRecentActivity);

module.exports = router;
