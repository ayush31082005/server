const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema({
    sellerId: {
        type: String,
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    category: String,
    subject: String,
    message: String,
    ticket: String,
    status: {
        type: String,
        default: "Pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Grievance", grievanceSchema);