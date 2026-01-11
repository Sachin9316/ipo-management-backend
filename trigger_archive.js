import mongoose from 'mongoose';
import { archiveOldIPOs } from './src/services/scraper.service.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    try {
        console.log("Connecting to DB...");
        const uri = process.env.DB_URL;
        if (!uri) throw new Error("DB_URL is undefined");
        await mongoose.connect(uri);
        console.log("Connected. Starting Archiving...");

        const count = await archiveOldIPOs();
        console.log(`Archiving Complete. Modified: ${count}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

run();
