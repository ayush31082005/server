const express = require("express");
const router = express.Router();

const {
  createFranchiseDashboard,
  getFranchiseDashboard
} = require("../controllers/franchiseDashboardController");

const upload = require("../middleware/upload");

router.post(
  "/create-dashboard",
  upload.fields([
    { name: "profilePhoto" },
    { name: "panCard" },
    { name: "aadhaarCard" },
    { name: "gstCertificate" }
  ]),
  createFranchiseDashboard
);

router.get("/dashboard/:id", getFranchiseDashboard);

module.exports = router;
