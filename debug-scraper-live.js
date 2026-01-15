
import { scrapeAndSaveMainboardIPOs } from './src/services/scraper.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const run = async () => {
    const logStream = fs.createWriteStream('debug_run_logs.txt', { flags: 'a' });
    const log = (msg) => {
        console.log(msg);
        logStream.write(typeof msg === 'object' ? JSON.stringify(msg) + '\n' : msg + '\n');
    };

    try {
        await mongoose.connect(process.env.DB_URL);
        log("DB Connected for Live Scrape Test");

        log("Triggering Mainboard Sync...");
        const result = await scrapeAndSaveMainboardIPOs(20);

        log("Sync Result: " + JSON.stringify(result));

        await mongoose.connection.close();
    } catch (error) {
        log("Run Error: " + error.message);
        console.error(error);
    } finally {
        logStream.end();
    }
};

run();
