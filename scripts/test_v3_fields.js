const axios = require('axios');
const qs = require('querystring');

const credentials = {
    username: "IP9628145157",
    token: "6392ddec58adf77d49455bfa17107ebd"
};

const testV3OrderIdVariations = async () => {
    const url = "http://www.connect.inspay.in/v3/recharge/api";
    const ord = "ORD" + Date.now();
    
    const fieldNames = ['orderid', 'order_id', 'oid', 'request_id', 'txn_id', 'txnid', 'id'];

    console.log("--- Testing v3 OrderID Field Variations ---");
    for (const field of fieldNames) {
        const payload = { 
            ...credentials, 
            mobile: "6387421346", 
            operator: "RJ", 
            amount: "10"
        };
        payload[field] = ord;

        console.log(`Testing field name: ${field}`);
        try {
            const res = await axios.post(url, qs.stringify(payload), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 20000
            });
            console.log(`  Result: ${JSON.stringify(res.data)}`);
            if (res.data.status !== 'Failure' || !res.data.message.includes('orderid')) {
                console.log(`  >>> SUCCESS/DIFFERENT ERROR with field: ${field} <<<`);
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }
    }
};

testV3OrderIdVariations();
