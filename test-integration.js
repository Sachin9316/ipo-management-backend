import { fetchChittorgarhAPIData } from './src/services/chittorgarh-list.service.js';
import { scrapeAndSaveIPOData } from './src/services/scraper.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// MOCK MONGOOSE (Avoid DB writes if possible, OR just connect to verify real data)
// For meaningful verification of the full flow, connecting to DB (dev) is best, 
// OR we can just mock schema saving.
// But calling the services directly creates real Objects.

async function testConsolidatedFlow() {
    console.log("--- Testing fetchChittorgarhAPIData individually ---");
    const apiData = await fetchChittorgarhAPIData();
    console.log(`Fetched ${apiData.length} items from Chittorgarh API.`);
    if (apiData.length > 0) {
        console.log("Sample Item:", JSON.stringify(apiData[0], null, 2));
    } else {
        console.error("API returned no data. Check URL construction.");
    }

    console.log("\n--- Testing Full Merge Flow (scrapeAndSaveIPOData) ---");
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB Connected.");

        // This will run REAL merge logic and save to DB
        const result = await scrapeAndSaveIPOData(2);
        console.log("Merge Result:", result);
    } catch (e) {
        console.error("Error in merge flow:", e);
    } finally {
        await mongoose.disconnect();
    }
}

testConsolidatedFlow();
