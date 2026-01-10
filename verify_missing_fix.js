import { scrapeAndSaveSmeIPOs } from './src/services/scraper.service.js';
import Mainboard from './src/models/mainboard.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const verifyMissingFix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.DB_URL);
        console.log("Connected to DB");

        // 1. Run SME sync with limit 100 to catch everything
        console.log("Running SME sync (limit 100)...");
        await scrapeAndSaveSmeIPOs(100);

        // 2. Check Modern Diagnostic
        const modern = await Mainboard.findOne({ slug: /modern-diagnostic/i });
        if (modern) {
            console.log(`\nModern Diagnostic:`);
            console.log(`- Lot Size: ${modern.lot_size}`);
            console.log(`- Lot Price: ${modern.lot_price}`);
            console.log(`- Registrar: ${modern.registrarName}`);
            if (modern.lot_size > 0 && modern.registrarName !== 'N/A') {
                console.log("SUCCESS: Modern Diagnostic data populated.");
            } else {
                console.log("FAILURE: Modern Diagnostic still missing data.");
            }
        }

        // 3. Check Gabion
        const gabion = await Mainboard.findOne({ slug: /gabion-technologies/i });
        if (gabion) {
            console.log(`\nGabion Technologies:`);
            console.log(`- Lot Size: ${gabion.lot_size}`);
            console.log(`- Registrar: ${gabion.registrarName}`);
            if (gabion.registrarName !== 'N/A' && gabion.registrarName.toLowerCase().includes('kfin')) {
                console.log("SUCCESS: Gabion Registrar (Kfin) populated.");
            } else {
                console.log("FAILURE: Gabion Registrar still missing or incorrect.");
            }
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

verifyMissingFix();
