import { scrapeAndSaveSmeIPOs } from './src/services/scraper.service.js';
import Mainboard from './src/models/mainboard.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const verifyFix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.DB_URL);
        console.log("Connected to DB");

        const result = await scrapeAndSaveSmeIPOs(30);
        console.log("Sync Result Success:", result.success);

        const namesToCheck = ['Modern Diagnostic', 'E to E Transportation', 'Admach Systems'];
        for (const name of namesToCheck) {
            const ipo = await Mainboard.findOne({ companyName: new RegExp(name, 'i') });
            if (ipo) {
                console.log(`- ${ipo.companyName}: ${ipo.ipoType} (Lot: ${ipo.lot_size}, Price: ${ipo.lot_price})`);
            } else {
                console.log(`- ${name} not found in DB`);
            }
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

verifyFix();
