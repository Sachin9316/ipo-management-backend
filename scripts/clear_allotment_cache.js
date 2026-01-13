import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import dbConnect from '../src/config/db.js';
import AllotmentResult from '../src/models/AllotmentResult.js';

const clearCache = async () => {
    try {
        console.log('Connecting to database...');
        await dbConnect();

        console.log('Clearing AllotmentResult collection...');
        const result = await AllotmentResult.deleteMany({});

        console.log(`✅ Success! Deleted ${result.deletedCount} records from allotment cache.`);

    } catch (error) {
        console.error('❌ Error clearing cache:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

clearCache();
