
import { fetchKFintechIPOList, checkKFintechStatus } from './src/services/kfintech.service.js';

async function testScraper() {
    console.log("Testing fetchKFintechIPOList...");
    const ipos = await fetchKFintechIPOList();
    console.log("Fetched IPOs:", JSON.stringify(ipos, null, 2));

    if (ipos.length === 0) {
        console.error("No IPOs found! Regex or selector might be broken.");
    } else {
        console.log(`Found ${ipos.length} IPOs.`);
    }

    // Optional: Test a specific IPO check if you have a dummy PAN and known IPO
    // const result = await checkKFintechStatus({ companyName: "Test IPO", kfintech_client_id: "123" }, ["ABCDE1234F"]);
    // console.log("Check Result:", result);
}

testScraper();
