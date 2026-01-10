import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeAndSaveIPOData } from './src/services/scraper.service.js';

dotenv.config();

const runSync = async () => {
    try {
        console.log("Connecting to DB at:", process.env.MONGODB_URI ? "URI Found" : "URI Missing");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected. Triggering Sync...");

        const result = await scrapeAndSaveIPOData(10);
        console.log("Sync Result:", JSON.stringify(result, null, 2));

        const Mainboard = (await import('./src/models/mainboard.model.js')).default;
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
