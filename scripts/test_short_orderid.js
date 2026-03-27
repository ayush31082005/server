const axios = require('axios');
const qs = require('querystring');

const testShortOrderId = async () => {
    const url = "http://www.connect.inspay.in/v3/recharge/api";
    const ord = "123456"; 
    
    const payload = { 
        username: "IP9628145157",
        token: "6392ddec58adf77d49455bfa17107ebd",
        opcode: "RJ",
        number: "6387421346",
        amount: "15",
        orderid: ord
    };

    console.log(`Testing with short orderid: ${ord}`);
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

testShortOrderId();
