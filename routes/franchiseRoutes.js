// const express = require("express");
// const router = express.Router();
// const franchiseController = require("../controllers/franchiseController");
// const { protect } = require("../middleware/authMiddleware");

// // ADMIN ADD
// router.post("/add", protect, franchiseController.addFranchise);

// // WEBSITE LIST (Public)
// router.get("/list", franchiseController.getFranchiseList);

// // ADMIN PANEL LIST (Protected)
// router.get("/admin-list", protect, franchiseController.getAdminFranchiseList);

// module.exports = router;





const express = require("express");
const router = express.Router();

const franchiseController = require("../controllers/franchiseController");
const { protect } = require("../middleware/authMiddleware");


// ================= ADMIN ADD =================
router.post("/add", protect, franchiseController.addFranchise);


// ================= WEBSITE LIST (Public) =================
router.get("/list", franchiseController.getFranchiseList);


// ================= ADMIN PANEL LIST =================
router.get("/admin-list", protect, franchiseController.getAdminFranchiseList);


// ================= FRANCHISE LOGIN =================
router.post("/login", franchiseController.franchiseLogin);


module.exports = router;
