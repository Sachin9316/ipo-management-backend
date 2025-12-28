import { scrapeIPOData } from './src/services/scraper.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
    try {
        console.log("Running scraper for ICICI Prudential AMC...");
        // Increase limit to find ICICI if it's further down, or just check the first few
        const data = await scrapeIPOData(10);

        const icici = data.find(ipo => ipo.companyName.includes('ICICI Prudential AMC'));

        if (icici) {
            console.log("\n--- ICICI Prudential AMC Results ---");
            console.log("Price Range:", icici.min_price, "-", icici.max_price);
            console.log("Subscription Total:", icici.subscription.total);
            console.log("Subscription Details:", icici.subscription);

            if (icici.min_price === 2061 && icici.max_price === 2165) {
                console.log("SUCCESS: Price range parsed correctly!");
            } else {
                console.log("FAILURE: Price range parsing issues.");
            }
        } else {
            console.log("ICICI Prudential AMC not found in recent IPOs. Checking first IPO for price parsing instead...");
            const first = data[0];
            console.log("First IPO:", first.companyName);
            console.log("Price Range:", first.min_price, "-", first.max_price);
        }

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

verify();
