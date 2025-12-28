import { scrapeAndSaveIPOData } from './src/services/scraper.service.js';
import dbConnect from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function fixData() {
    try {
        console.log("Connecting to database...");
        await dbConnect();

        console.log("Running scraper with fixed logic (limit=40)...");
        const result = await scrapeAndSaveIPOData(40);
        console.log(`Fix Result: Processed ${result.total}, Saved/Updated ${result.count} IPOs.`);

        process.exit(0);
    } catch (error) {
        console.error("Fix failed:", error);
        process.exit(1);
    }
}

fixData();
