const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String },
        email: { type: String },
        phone: { type: String },
        enquiryType: { type: String, default: "Product Enquiry" },
        message: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);