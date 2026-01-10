import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeAndSaveIPOData } from '../services/scraper.service.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runSync = async () => {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected. Triggering Sync...");

        const result = await scrapeAndSaveIPOData(10); // Limit 10 to cover recent ones
        console.log("Sync Result:", result);

        // Fetch the specific IPO to check if it updated
        const Mainboard = (await import('../models/mainboard.model.js')).default;
        const ipo = await Mainboard.findOne({ companyName: /Bharat Coking/i });
        if (ipo) {
            console.log("\n--- Verification for Bharat Coking ---");
            console.log("Subscription Data:", JSON.stringify(ipo.subscription, null, 2));
        } else {
            console.log("Bharat Coking IPO not found in DB.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

runSync();
