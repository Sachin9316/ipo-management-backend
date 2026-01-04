
import { fetchKFintechIPOList, checkKFintechStatus } from '../services/kfintech.service.js';

const run = async () => {
    console.log('--- TEST: KFintech API ---');

    // 1. Fetch List
    const list = await fetchKFintechIPOList();
    console.log('List Sample:', list.slice(0, 3));

    // 2. Try to match a known recent IPO (from User Request or recent news)
    // User request had: "ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY LIMITED"
    const targetName = "ICICI PRUDENTIAL ASSET MANAGEMENT COMPANY LIMITED";

    // 3. Test Status Check (with dummy PAN)
    console.log(`\nTesting Status Check for "${targetName}" with dummy PAN...`);
    const status = await checkKFintechStatus(targetName, ['ABCDE1234F']); // Invalid PAN
    console.log('Status Result:', JSON.stringify(status, null, 2));
};

run().catch(console.error);
