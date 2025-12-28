import { scrapeIPOData } from './src/services/scraper.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function reproduce() {
    try {
        console.log("Locating ICICI Prudential AMC IPO in main list...");
        // This might be tricky if it's not in the first 'limit' rows
        // Let's force a larger limit to find it if it's recent
        const data = await scrapeIPOData(30);

        const target = data.find(ipo => ipo.companyName.includes('ICICI Prudential AMC'));

        if (target) {
            console.log("Found IPO Data:");
            console.dir(target, { depth: null });

            if (target.min_price === 0 || target.max_price === 0) {
                console.log("\nISSUE REPRODUCED: Price range is missing (0).");
            } else {
                console.log("\nPrice range found:", target.min_price, "-", target.max_price);
            }

            if (target.subscription.total === 0) {
                console.log("ISSUE REPRODUCED: Subscription data is missing (0).");
            } else {
                console.log("Subscription data found:", target.subscription.total);
            }
        } else {
            console.log("\nCould not find 'ICICI Prudential AMC' in the first 30 IPOs.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Reproduction failed:", error);
        process.exit(1);
    }
}

reproduce();
