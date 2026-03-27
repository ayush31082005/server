const axios = require('axios');
const qs = require('querystring');

const credentials = {
    username: "IP9628145157",
    token: "6392ddec58adf77d49455bfa17107ebd"
};

const testNumericOrderId = async () => {
    const url = "http://www.connect.inspay.in/v3/recharge/api";
    const ord = Math.floor(Date.now() / 1000).toString(); // Numeric string
    
    const payload = { 
        ...credentials, 
        mobile: "6387421346", 
        operator: "RJ", 
        amount: "10",
        orderid: ord
    };

    console.log(`Testing with numeric orderid: ${ord}`);
    try {
        const res = await axios.post(url, qs.stringify(payload), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 20000
        });
        console.log(`  Result: ${JSON.stringify(res.data)}`);
    } catch (err) {
        console.log(`  Error: ${err.message}`);
    }
};

testNumericOrderId();
