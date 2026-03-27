const axios = require('axios');
const qs = require('querystring');

const credentials = {
    username: "IP9628145157",
    token: "6392ddec58adf77d49455bfa17107ebd"
};

const testV3WithOrderId = async () => {
    const url = "http://www.connect.inspay.in/v3/recharge/api";
    const orderid = "ORD" + Date.now();
    
    // Testing v3 with orderid and different field names
    const payloads = [
        { ...credentials, mobile: "6387421346", operator: "RJ", amount: "10", orderid: orderid },
        { ...credentials, number: "6387421346", operator: "RJ", amount: "10", orderid: orderid }
    ];

    console.log("--- Testing v3 with OrderID ---");
    for (const payload of payloads) {
        console.log(`Testing with mobile/number and orderid: ${JSON.stringify(payload).substring(0, 150)}`);
        try {
            const res = await axios.post(url, qs.stringify(payload), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 20000
            });
            console.log(`  v3 Result: ${JSON.stringify(res.data)}`);
        } catch (err) {
            console.log(`  v3 Error: ${err.message}`);
        }
    }

    console.log("\n--- Testing api/recharge/post without IP prefix ---");
    const urlPost = "https://www.connect.inspay.in/api/recharge/post";
    const payloadNoIp = { username: "9628145157", token: credentials.token, mobile: "6387421346", operator: "JIO", amount: "10" };
    try {
        const res = await axios.post(urlPost, payloadNoIp, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        });
        console.log(`  api/recharge/post (No IP) Result: ${JSON.stringify(res.data).substring(0, 100)}`);
    } catch (err) {
        if (err.response?.data && typeof err.response.data === 'string' && err.response.data.includes('<html')) {
            console.log(`  api/recharge/post (No IP) Error: Still HTML Redirect.`);
        } else {
            console.log(`  api/recharge/post (No IP) Error: ${err.message}`);
        }
    }
};

testV3WithOrderId();
