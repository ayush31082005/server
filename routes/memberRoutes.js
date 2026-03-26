const express = require("express");
const router = express.Router();

const {
    addMember,
    getMembers,
    getMember,
    updateMember,
    deleteMember
} = require("../controllers/memberController");

router.post("/add", addMember);

router.get("/", getMembers);

router.get("/:id", getMember);

router.put("/:id", updateMember);

router.delete("/:id", deleteMember);

module.exports = router;
