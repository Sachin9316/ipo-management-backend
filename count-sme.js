import dbConnect from './src/config/db.js';
import Mainboard from './src/models/mainboard.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function countIPOs() {
    try {
        await dbConnect();
        const totalSME = await Mainboard.countDocuments({ ipoType: 'SME' });
        const shyamDhani = await Mainboard.findOne({ companyName: /Shyam Dhani/i });

        console.log("Total SME IPOs:", totalSME);
        if (shyamDhani) {
            console.log("Shyam Dhani found with ID:", shyamDhani._id);
            console.log("Type:", shyamDhani.ipoType);
            console.log("Status:", shyamDhani.status);
        }

        const recentSMEs = await Mainboard.find({ ipoType: 'SME' }).sort({ createdAt: -1 }).limit(20).select('companyName status');
        console.log("\nRecent 20 SME IPOs in DB:");
        recentSMEs.forEach((ipo, i) => console.log(`${i + 1}. ${ipo.companyName} - ${ipo.status}`));

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

countIPOs();
