const express = require("express");
const router = express.Router();

const {
    createGrievance,
    getAllGrievances,
    updateStatus,
    trackGrievance,
    getUserGrievances,
    fixAllUsersGrievances
} = require("../controllers/grievanceController");

// Routes
router.post("/create", createGrievance);
router.get("/all", getAllGrievances);
router.post("/update", updateStatus);
router.post("/track", trackGrievance);
router.get("/user/:email", getUserGrievances);  // 👈 YAHI USE HOGA
router.get("/fix-all", fixAllUsersGrievances);

module.exports = router;
