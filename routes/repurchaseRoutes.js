const express = require("express");
const router = express.Router();
const {
    getRepurchaseLevelIncome,
} = require("../controllers/repurchaseController");
const { protect } = require("../middleware/authMiddleware");

// GET /api/repurchase/level-income
router.get("/level-income", protect, getRepurchaseLevelIncome);

module.exports = router;
