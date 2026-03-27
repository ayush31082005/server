const Contact = require("../models/Contact");
<<<<<<< HEAD
=======
const sendEmail = require("../utils/sendEmail");
>>>>>>> 093b684 (initial server commit)

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

<<<<<<< HEAD
        res.status(201).json({ success: true, message: "Message sent successfully!" });

    } catch (error) {
        console.error(error);
=======
        // Send Email Notification
        const subject = `New Contact Inquiry from ${name}`;
        const text = `
            New inquiry received:
            Name: ${name}
            Email: ${email || 'N/A'}
            Phone: ${phone || 'N/A'}
            Enquiry Type: ${enquiryType || 'N/A'}
            Message: ${message}
        `;
        
        // Notify admin (and optionally the sender)
        await sendEmail(process.env.EMAIL_USER, subject, text).catch(err => console.error("Contact Form Email Error:", err));

        res.status(201).json({ success: true, message: "Message sent successfully!" });

    } catch (error) {
        console.error("Contact Form Error:", error);
>>>>>>> 093b684 (initial server commit)
        res.status(500).json({ message: "Server Error" });
    }
};

<<<<<<< HEAD
=======

>>>>>>> 093b684 (initial server commit)
// ================= GET ALL MESSAGES (Admin) =================
exports.getMessages = async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};