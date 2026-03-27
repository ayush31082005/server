const axios = require('axios');
const qs = require('querystring');

const credentials = {
    username: "IP9628145157",
    token: "6392ddec58adf77d49455bfa17107ebd"
};

const testV3Https = async () => {
    const url = "https://www.connect.inspay.in/v3/recharge/api";
    const ord = Date.now().toString();
    
    const payload = { 
        ...credentials, 
        mobile: "6387421346", 
        operator: "RJ", 
        amount: "10",
        orderid: ord
    };

    console.log(`Testing HTTPS v3 with orderid: ${ord}`);
    try {
        const res = await axios.post(url, qs.stringify(payload), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 20000
        });
        console.log(`  Result: ${JSON.stringify(res.data).substring(0, 100)}`);
    } catch (err) {
        if (err.response?.data && typeof err.response.data === 'string' && err.response.data.includes('<html')) {
            console.log(`  Error: HTML Redirect detected.`);
        } else {
            console.log(`  Error: ${err.message}`);
        }
    }
};

testV3Https();
