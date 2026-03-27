const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
    {
<<<<<<< HEAD
        firstName: { type: String, required: true },
        lastName: { type: String },
=======
        name: { type: String, required: true },
>>>>>>> 093b684 (initial server commit)
        email: { type: String },
        phone: { type: String },
        enquiryType: { type: String, default: "Product Enquiry" },
        message: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);