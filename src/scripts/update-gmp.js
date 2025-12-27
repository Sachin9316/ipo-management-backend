import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dbConnect from '../config/db.js';
import { syncAllGMPData } from '../services/gmp-scraper.service.js';

dotenv.config();

const run = async () => {
    try {
        await dbConnect();
        const result = await syncAllGMPData();
        console.log('GMP Sync Result:', result);
        process.exit(0);
    } catch (error) {
        console.error('GMP Sync Script Failed:', error);
        process.exit(1);
    }
};

run();
