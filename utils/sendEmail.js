const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
<<<<<<< HEAD
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: `"Sanyukt Parivaar and Rich Life" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text
    });
=======
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465, // Using 465 (SSL) is often more stable for Gmail in production
            secure: true, 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            connectionTimeout: 10000, // 10 seconds timeout
        });

        const mailOptions = {
            from: `"Sanyukt Parivaar and Rich Life" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email SUCCESS: Sent to ${to}. Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Email FAILURE: Could not send to ${to}.`);
        console.error("Technical Error Details:", error.message);
        throw error;
    }
>>>>>>> 093b684 (initial server commit)
};

module.exports = sendEmail;