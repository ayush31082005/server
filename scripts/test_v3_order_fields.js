const axios = require('axios');
const qs = require('querystring');

const testV3OrderFields = async () => {
    const url = "http://www.connect.inspay.in/v3/recharge/api";
    const username = "9628145157"; // Raw numeric seems to work for v3
    const token = "6392ddec58adf77d49455bfa17107ebd";
    
    // Possible field names for "orderid"
    const fields = ['orderid', 'order_id', 'oid', 'txnid', 'txn_id', 'client_id', 'reference_id', 'id'];
    const val = "ORD" + Date.now();

    for (const field of fields) {
        const payload = { 
            username,
            token,
            opcode: "RJ",
            number: "6387421346",
            amount: "15"
        };
        payload[field] = val;

        console.log(`Testing field [${field}]...`);
        try {
            const res = await axios.post(url, qs.stringify(payload), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000
            });
            console.log(`  Result: ${JSON.stringify(res.data)}`);
            if (res.data && res.data.status !== 'Failure') {
                console.log(`!!! SUCCESS WITH FIELD: ${field} !!!`);
                break;
            }
        } catch (err) {
            console.log(`  Error: ${err.message}`);
        }
    }
};

testV3OrderFields();
