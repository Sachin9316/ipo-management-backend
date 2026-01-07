
import { checkBigshareStatus } from './src/services/bigshare.service.js';

(async () => {
    // IPO from the dump: NANTA TECH LIMITED (Value: 561)
    // Or just "NANTA" for fuzzy match test
    const ipoName = "NANTA TECH LIMITED";
    const pan = "AMYPU5615K"; // Using user's PAN

    console.log(`Testing Bigshare for ${ipoName} with PAN ${pan}`);
    const results = await checkBigshareStatus(ipoName, [pan]);
    console.log("Results:", JSON.stringify(results, null, 2));
})();
