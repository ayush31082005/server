const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require(path.join(__dirname, '../models/User'));

const verifyRecharge = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        let user = await User.findOne({ email: 'test_recharge@example.com' });
        if (!user) {
            user = await User.create({ email: 'test_recharge@example.com', userName: 'Test User', role: 'user', mobile: '1234567890' });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        const port = process.env.PORT || 5001;
        const baseUrl = `http://localhost:${port}/api/recharge`;
        
        const testData = { mobile: "6387421346", operator: "Jio", amount: 10 };
        const response = await axios.post(baseUrl, testData, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });
        console.log("Success:", response.data);
    } catch (error) {
        console.error("Failed:", error.response?.status, error.response?.data || error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

verifyRecharge();
