
import { checkBigshareStatus } from './src/services/bigshare.service.js';

(async () => {
    // IPO: Shyam Dhani Industries Limited
    // Note: In the dump we saw "SHYAM DHANI INDUSTRIES LIMITED" (Value 556)
    const ipoName = "SHYAM DHANI INDUSTRIES LIMITED";
    const pan = "AMYPU5615K";

    console.log(`Testing Bigshare for ${ipoName} with PAN ${pan}`);
    const results = await checkBigshareStatus(ipoName, [pan]);
    console.log("Results:", JSON.stringify(results, null, 2));
})();
