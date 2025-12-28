import dbConnect from './src/config/db.js';
import Mainboard from './src/models/mainboard.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function countAll() {
    try {
        await dbConnect();
        const totalSME = await Mainboard.countDocuments({ ipoType: 'SME' });
        const totalMainboard = await Mainboard.countDocuments({ ipoType: 'MAINBOARD' });
        const totalListed = await Mainboard.countDocuments({ status: 'LISTED' });

        console.log("Counts in DB:");
        console.log("- Total SME IPOs:", totalSME);
        console.log("- Total Mainboard IPOs:", totalMainboard);
        console.log("- Total Listed IPOs:", totalListed);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

countAll();
