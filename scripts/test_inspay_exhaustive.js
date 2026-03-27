const axios = require('axios');
const qs = require('querystring');

const credentials = {
    username: "IP9628145157",
    token: "6392ddec58adf77d49455bfa17107ebd"
};

const testEndpoints = async () => {
    const endpoints = [
        "https://www.connect.inspay.in/api/recharge/post",
        "http://www.connect.inspay.in/v3/recharge/api"
    ];

    const combinations = [
        { field: 'mobile', operator: 'JIO', amount: '10' },
        { field: 'number', operator: 'JIO', amount: '10' },
        { field: 'mobile', operator: 'RJ', amount: '10' },
        { field: 'number', operator: 'RJ', amount: '10' }
    ];

    for (const url of endpoints) {
        console.log(`\n--- Testing Endpoint: ${url} ---`);
        for (const comb of combinations) {
            const payload = { ...credentials, operator: comb.operator, amount: comb.amount };
            payload[comb.field] = "6387421346";

            console.log(`Testing with field: ${comb.field}, operator: ${comb.operator}`);
            
            try {
                // Test JSON
                const resJson = await axios.post(url, payload, { 
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 20000 
                });
                console.log(`  JSON Result: ${JSON.stringify(resJson.data).substring(0, 100)}`);
            } catch (err) {
                console.log(`  JSON Error: ${err.message} (Status: ${err.response?.status})`);
                if (err.response?.status === 400 && typeof err.response.data === 'string' && err.response.data.includes('<html')) {
                    console.log(`  JSON Error: HTML Redirect detected.`);
                } else if (err.response?.data) {
                    console.log(`  JSON Error Detail: ${JSON.stringify(err.response.data).substring(0, 100)}`);
                }
            }

            try {
                // Test Form
                const resForm = await axios.post(url, qs.stringify(payload), { 
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 20000 
                });
                console.log(`  FORM Result: ${JSON.stringify(resForm.data).substring(0, 100)}`);
            } catch (err) {
                console.log(`  FORM Error: ${err.message} (Status: ${err.response?.status})`);
                if (err.response?.data && typeof err.response.data === 'string' && err.response.data.includes('<html')) {
                    console.log(`  FORM Error: HTML Redirect detected.`);
                } else if (err.response?.data) {
                    console.log(`  FORM Error Detail: ${JSON.stringify(err.response.data).substring(0, 100)}`);
                }
            }
        }
    }
};

testEndpoints();
