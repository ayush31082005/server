const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

router.post("/contact", contactController.sendMessage);
router.get("/contact", contactController.getMessages);

module.exports = router;