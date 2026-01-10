import { scrapeChittorgarhSubscription } from './src/services/chittorgarh.service.js';
import { isMatch } from './src/utils/matching.js';
import fs from 'fs';

const runDebug = async () => {
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('sync_debug_log.txt', msg + '\n');
    };

    try {
        log("Starting Debug V2...");

        // 1. Fetch Subscription Data
        log("Fetching Subscription Data...");
        const subscriptionData = await scrapeChittorgarhSubscription();
        log(`Fetched ${subscriptionData.length} records.`);

        if (subscriptionData.length > 0) {
            log(`Sample Sub Data: ${JSON.stringify(subscriptionData[0])}`);
        }

        // 2. Mock IPO
        const mockIPO = {
            companyName: "Bharat Coking Coal Ltd.",
            slug: "bharat-coking-coal-bccl"
        };
        log(`Mock IPO: ${JSON.stringify(mockIPO)}`);

        // 3. Match
        log("Attempting Match...");
        const subInfo = subscriptionData.find(s => {
            const match = isMatch(s.companyName, mockIPO.companyName);
            if (match) log(`Match Found! ${s.companyName} == ${mockIPO.companyName}`);
            return match;
        });

        if (subInfo) {
            log("\n--- MATCH SUCCESS ---");
            log(`Data found: ${JSON.stringify(subInfo, null, 2)}`);
        } else {
            log("\n--- MATCH FAILED ---");
            log("Available Names in Subscription Data:");
            subscriptionData.forEach(s => log(`- ${s.companyName}`));
        }

    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(error.stack);
    }
};

runDebug();
