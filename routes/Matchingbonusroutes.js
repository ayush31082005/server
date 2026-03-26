const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    getMatchingBonusReport,
    getAllMatchingSummary,
} = require("../controllers/Matchingbonuscontroller");

// GET /api/mlm/matching-bonus/silver
// GET /api/mlm/matching-bonus/gold
// GET /api/mlm/matching-bonus/diamond
router.get("/matching-bonus/:type", protect, getMatchingBonusReport);

// GET /api/mlm/matching-bonus-summary  (all 3 in one call)
router.get("/matching-bonus-summary", protect, getAllMatchingSummary);

module.exports = router;
