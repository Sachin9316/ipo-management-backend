import { scrapeIPOData } from './src/services/scraper.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log("Checking scraper output...");
        const data = await scrapeIPOData(2);
        console.log("Scraped Data (First 2):");
        console.dir(data, { depth: null });

        if (data.length > 0) {
            console.log("\nScraper seems to be working! Found company:", data[0].companyName);
            process.exit(0);
        } else {
            console.log("\nScraper found no data.");
            process.exit(1);
        }
    } catch (error) {
        console.error("Scraper Test Failed:", error);
        process.exit(1);
    }
}

test();
