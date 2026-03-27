const axios = require('axios');

const testV3JsonNoIp = async () => {
    const url = "http://www.connect.inspay.in/v3/recharge/api";
    const ord = "ORD" + Date.now();
    
    const payload = { 
        username: "9628145157",
        token: "6392ddec58adf77d49455bfa17107ebd",
        opcode: "RJ",
        number: "6387421346",
        amount: "15",
        orderid: ord
    };

    console.log(`Testing v3 JSON (No IP): ${JSON.stringify(payload)}`);
    try {
        const res = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
        });
        console.log(`  Result: ${JSON.stringify(res.data)}`);
    } catch (err) {
        console.log(`  Error: ${err.message}`);
    }
};

testV3JsonNoIp();
