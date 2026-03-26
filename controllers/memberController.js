const Member = require("../models/Member");

// ADD MEMBER
exports.addMember = async (req, res) => {
    try {

        const { name, mobile, package, status } = req.body;

        const memberId = "FR" + Math.floor(10000 + Math.random() * 90000);

        const member = new Member({
            memberId,
            name,
            mobile,
            package,
            status
        });

        await member.save();

        res.json({
            success: true,
            message: "Member added successfully",
            data: member
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// GET ALL MEMBERS
exports.getMembers = async (req, res) => {

    try {

        const members = await Member.find().sort({ joiningDate: -1 });

        res.json({
            success: true,
            data: members
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// GET SINGLE MEMBER
exports.getMember = async (req, res) => {

    try {

        const member = await Member.findById(req.params.id);

        res.json({
            success: true,
            data: member
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// UPDATE MEMBER
exports.updateMember = async (req, res) => {

    try {

        const member = await Member.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json({
            success: true,
            message: "Member updated successfully",
            data: member
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// DELETE MEMBER
exports.deleteMember = async (req, res) => {

    try {

        await Member.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Member deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};
