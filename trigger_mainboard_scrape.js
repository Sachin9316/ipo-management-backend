import mongoose from 'mongoose';
import { scrapeAndSaveMainboardIPOs } from './src/services/scraper.service.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        console.log("Connecting to DB...");
        const uri = process.env.DB_URL;
        if (!uri) throw new Error("DB_URL is undefined");
        await mongoose.connect(uri);
        console.log("Connected. Starting Mainboard Scrape (Logo Fix)...");

        // Convert logic check
        const result = await scrapeAndSaveMainboardIPOs(50);
        console.log("Scrape Result:", result);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

run();
