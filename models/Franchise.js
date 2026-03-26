const mongoose = require("mongoose");

const franchiseSchema = new mongoose.Schema({
    franchiseId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    // ✅ ADMIN ONLY PASSWORD
    password: {
        type: String,
        required: true,
        select: false   // frontend public me hide
    }
}, { timestamps: true });

// FIX: Make sure model name matches
module.exports = mongoose.model("Franchise", franchiseSchema);