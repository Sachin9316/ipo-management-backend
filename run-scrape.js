import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeAndSaveIPOData } from './src/services/scraper.service.js';
import { syncAllGMPData } from './src/services/gmp-scraper.service.js';

dotenv.config();
const DB_URL = process.env.DB_URL;

async function runScrape() {
    console.log("Starting Full Scrape...");
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        console.log("\n--- Scraping IPO Data (Limit 30) ---");
        const ipoResult = await scrapeAndSaveIPOData(30);
        console.log("IPO Scrape Result:", ipoResult);

        console.log("\n--- Syncing GMP Data ---");
        const gmpResult = await syncAllGMPData();
        console.log("GMP Sync Result:", gmpResult);

        mongoose.disconnect();
        console.log("\nDone!");
    } catch (error) {
        console.error("Scrape Failed:", error);
    }
}

runScrape();
