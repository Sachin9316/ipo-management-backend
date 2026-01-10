import { scrapeChittorgarhIPOs } from './src/services/chittorgarh-list.service.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const debugSME = async () => {
    console.log("--- Debugging SME Scraping (Yajur Fibres) ---");
    try {
        // We can't easily filter by name in scrapeChittorgarhIPOs without modification
        // but we can check the first few.
        const ipos = await scrapeChittorgarhIPOs(5, 'SME');
        console.log(JSON.stringify(ipos, null, 2));
    } catch (e) {
        console.error(e);
    }
};

debugSME();
