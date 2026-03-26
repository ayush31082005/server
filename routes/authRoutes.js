const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/register", auth.register);
router.post("/verify-otp", auth.verifyOtp);
router.post("/login", auth.login);
router.post("/resend-otp", auth.resendOtp)
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);

router.get("/profile", protect, auth.profile);
router.put("/profile", protect, auth.updateProfile);
router.put("/kyc", protect, auth.submitKyc);
router.get("/sponsor/:id", auth.getSponsorName);
router.get("/public-profile/:id", auth.publicProfile);
router.post("/create-admin",
    protect,
    adminOnly,
    auth.createAdmin
);

module.exports = router;