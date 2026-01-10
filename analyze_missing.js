import Mainboard from './src/models/mainboard.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const analyzeMissingData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.DB_URL);
        console.log("Connected to DB");

        const totalSme = await Mainboard.countDocuments({ ipoType: 'SME' });
        const missingLot = await Mainboard.countDocuments({ ipoType: 'SME', $or: [{ lot_size: 0 }, { lot_size: { $exists: false } }] });
        const missingReg = await Mainboard.countDocuments({ ipoType: 'SME', $or: [{ registrarName: 'N/A' }, { registrarName: { $exists: false } }, { registrarName: '-' }] });

        console.log(`Total SME IPOs: ${totalSme}`);
        console.log(`SME IPOs missing Lot Size: ${missingLot}`);
        console.log(`SME IPOs missing Registrar: ${missingReg}`);

        // Find some example IPOs with missing data to verify links
        const examples = await Mainboard.find({
            ipoType: 'SME',
            $or: [{ lot_size: 0 }, { registrarName: 'N/A' }]
        }).limit(5).select('companyName slug link');

        console.log("\nExamples with missing data:");
        examples.forEach(e => console.log(`- ${e.companyName} (Slug: ${e.slug}, Link: ${e.link})`));

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

analyzeMissingData();
