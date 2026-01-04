
import { checkAllotment } from '../controllers/allotment.controller.js';

// Mock Request and Response
const req = {
    body: {
        ipoName: "ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY LIMITED",
        registrar: "KFINTECH",
        panNumbers: ["AMYPU5615k", "ABCDE1234F"]
    }
};

const res = {
    status: (code) => {
        console.log('Status:', code);
        return res;
    },
    json: (data) => {
        console.log('JSON Output:', JSON.stringify(data, null, 2));
        return res;
    }
};

const run = async () => {
    console.log('--- TEST: Controller Integration ---');
    await checkAllotment(req, res);
};

run().catch(console.error);
