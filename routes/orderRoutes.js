const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ================= USER ROUTES =================
router.post("/", protect, orderController.createOrder);
router.post("/razorpay-order", protect, orderController.createRazorpayOrder);
router.get("/myorders", protect, orderController.myOrders);
// ================= ADMIN ROUTES =================
router.get("/admin/all", protect, adminOnly, orderController.getAllOrders);
router.put("/admin/:id", protect, adminOnly, orderController.updateOrderStatus);

// ================= GET SINGLE ORDER =================
router.get("/:id", protect, orderController.getOrder);

module.exports = router;
