const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminUserController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All admin routes are protected and require admin role
router.use(protect, adminOnly);

// User management routes
router.get("/", adminController.getAllUsers);
router.get("/:id", adminController.getUserById);
router.delete("/:id", adminController.deleteUser);
router.put("/:id", adminController.updateUser);
router.patch("/:id/status", adminController.updateUserStatus);
router.patch("/:id/role", adminController.updateUserRole);

module.exports = router;