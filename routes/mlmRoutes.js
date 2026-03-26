const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");

const mlmAdminController = require("../controllers/mlmAdminController");
const mlmController = require("../controllers/mlmController");

// Admin Routes
router.get("/admin/users", protect, adminOnly, mlmAdminController.getAllUsers);
router.post("/admin/update-user-status", protect, adminOnly, mlmAdminController.updateUserStatus);
router.get("/admin/income-reports", protect, adminOnly, mlmAdminController.getIncomeReports);
router.get("/admin/binary-tree/:userId", protect, adminOnly, mlmAdminController.getBinaryTree);

// Daily Tasks (Triggered by Admin or Cron)
router.post("/admin/calculate-binary", protect, adminOnly, async (req, res) => {
    console.log("DEBUG: HIT /api/mlm/admin/calculate-binary");
    await mlmController.calculateDailyMatchingBonus();
    res.json({ message: "Binary matching bonus calculated and distributed" });
});

router.post("/admin/calculate-profit-sharing", protect, adminOnly, async (req, res) => {
    const { dailyTurnover } = req.body;
    await mlmController.distributeProfitSharing(dailyTurnover);
    res.json({ message: "Profit sharing calculated and distributed" });
});

router.post("/admin/update-ranks", protect, adminOnly, async (req, res) => {
    await mlmController.updateAllRanks();
    res.json({ message: "All user ranks updated successfully" });
});

// User Routes
router.get("/get-stats", protect, mlmController.getMLMStats);
router.get("/get-stats/:userId", protect, adminOnly, mlmController.getMLMStats);
router.get("/get-directs", protect, mlmAdminController.getDirects);
router.get("/get-directs/:userId", protect, adminOnly, mlmAdminController.getDirects);
router.post("/repurchase", protect, async (req, res) => {
    const { amount, bv } = req.body;
    await mlmController.handleRepurchase(req.user._id, amount, bv);
    res.json({ message: "Repurchase recorded and income distributed" });
});
router.get("/binary-tree/:userId", protect, mlmAdminController.getBinaryTree); // Accessible by user for their own tree

// Downline Team Lists
router.get("/get-team-list/:type", protect, mlmAdminController.getTeamList);
router.get("/get-team-list/:type/:userId", protect, adminOnly, mlmAdminController.getTeamList);

module.exports = router;
