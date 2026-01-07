
import { checkMUFGStatus } from './src/services/mufg.service.js';

// User provided input
const IPO_NAME = "Gujarat Kidney";
const PAN = "AMYPU5615K";

console.log(`Testing MUFG Scraper for "${IPO_NAME}" with PAN "${PAN}"...`);

(async () => {
    const result = await checkMUFGStatus(IPO_NAME, [PAN]);
    console.log("Final Result:", JSON.stringify(result, null, 2));
})();
