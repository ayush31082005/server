const Contact = require("../models/Contact");

// ================= SEND MESSAGE =================
exports.sendMessage = async (req, res) => {
    try {
        const { name, email, phone, enquiryType, message } = req.body;

        if (!name || !message) {
            return res.status(400).json({ message: "Name and message are required" });
        }

        const contact = new Contact({
            name,
            email,
            phone,
            enquiryType,
            message,
        });

        await contact.save();

        res.status(201).json({ success: true, message: "Message sent successfully!" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ================= GET ALL MESSAGES (Admin) =================
exports.getMessages = async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};