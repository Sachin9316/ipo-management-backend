
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/allotment/check';

const run = async () => {
    console.log('--- TEST: E2E Allotment Check ---');

    // Payload mimicking the Frontend request
    const payload = {
        ipoName: "ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY LIMITED",
        registrar: "KFINTECH",
        panNumbers: ["AMYPU5615k", "ABCDE1234F"]
    };

    try {
        console.log(`Calling ${API_URL}...`);
        console.log('Payload:', payload);

        const response = await axios.post(API_URL, payload);

        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('E2E Test Failed:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
};

run().catch(console.error);
