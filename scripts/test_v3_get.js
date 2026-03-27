const axios = require('axios');
const qs = require('querystring');

const credentials = {
    username: "IP9628145157",
    token: "6392ddec58adf77d49455bfa17107ebd"
};

const testV3Get = async () => {
    const baseUrl = "http://www.connect.inspay.in/v3/recharge/api";
    const ord = Date.now().toString();
    
    const params = { 
        ...credentials, 
        mobile: "6387421346", 
        operator: "RJ", 
        amount: "10",
        orderid: ord
    };

    const finalUrl = `${baseUrl}?${qs.stringify(params)}`;
    console.log(`Testing GET: ${finalUrl.replace(credentials.token, 'REDACTED')}`);
    
    try {
        const res = await axios.get(finalUrl, { timeout: 20000 });
        console.log(`  Result: ${JSON.stringify(res.data)}`);
    } catch (err) {
        console.log(`  Error: ${err.message}`);
        console.log(`  Response: ${JSON.stringify(err.response?.data).substring(0, 100)}`);
    }
};

testV3Get();
