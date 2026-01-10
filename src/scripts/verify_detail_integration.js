import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeAndSaveIPOData } from '../services/scraper.service.js';
import Mainboard from '../models/mainboard.model.js';

dotenv.config();

const verifyIntegration = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to MongoDB');

        console.log('Running Scraper Sync...');
        const result = await scrapeAndSaveIPOData(25); // Process top 25
        console.log('Sync Result:', result);

        // Check for Modern Diagnostic
        const ipo = await Mainboard.findOne({ slug: { $regex: 'modern', $options: 'i' } });
        if (ipo) {
            console.log('\n--- Verification: Modern Diagnostic ---');
            console.log('Company Name:', ipo.companyName);
            console.log('Lot Size:', ipo.lot_size);
            console.log('Lot Price:', ipo.lot_price);
            console.log('Registrar:', ipo.registrarName);
            console.log('Registrar Link:', ipo.registrarLink);

            if (ipo.lot_size > 0 && ipo.registrarName !== 'N/A') {
                console.log('SUCCESS: Data enriched correctly.');
            } else {
                console.log('FAILURE: Missing Lot Size or Registrar.');
            }
        } else {
            console.log('Modern Diagnostic IPO not found in DB after sync.');
        }

    } catch (error) {
        console.error('Verification Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyIntegration();
