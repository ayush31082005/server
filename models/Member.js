const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
    memberId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    package: {
        type: String,
        enum: ["Silver", "Gold", "Platinum"],
        default: "Silver"
    },
    status: {
        type: String,
        enum: ["Active", "Pending"],
        default: "Active"
    },
    joiningDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Member", memberSchema);
