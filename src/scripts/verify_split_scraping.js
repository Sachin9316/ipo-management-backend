import { scrapeAndSaveMainboardIPOs, scrapeAndSaveSmeIPOs } from '../services/scraper.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const mongoUri = process.env.MONGO_URI || process.env.DB_URL;

if (!mongoUri) {
    console.error('ERROR: MONGO_URI/DB_URL is undefined. Check .env file.');
    console.log('Current ENV keys:', Object.keys(process.env));
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connect Error:', err.message);
        process.exit(1);
    }
};

const verify = async () => {
    await connectDB();

    console.log("--- Testing Mainboard Sync (Limit 1) ---");
    try {
        const mbResult = await scrapeAndSaveMainboardIPOs(1);
        console.log("Mainboard Result:", JSON.stringify(mbResult, null, 2));
    } catch (e) {
        console.error("Mainboard Sync Failed:", e.message);
    }

    console.log("\n--- Testing SME Sync (Limit 1) ---");
    try {
        const smeResult = await scrapeAndSaveSmeIPOs(1);
        console.log("SME Result:", JSON.stringify(smeResult, null, 2));
    } catch (e) {
        console.error("SME Sync Failed:", e.message);
    }

    console.log("\nDone.");
    process.exit(0);
};

verify();
