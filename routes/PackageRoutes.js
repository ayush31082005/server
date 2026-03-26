const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { activatePackage, getPackageStatus } = require("../controllers/PackageController");

// GET  /api/package/status        - current package info
// POST /api/package/activate      - activate a package
router.get("/status", protect, getPackageStatus);
router.post("/activate", protect, activatePackage);

module.exports = router;
