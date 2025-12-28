import dbConnect from './src/config/db.js';
import Mainboard from './src/models/mainboard.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function compare() {
    try {
        await dbConnect();
        const shyam = await Mainboard.findOne({ companyName: /Shyam Dhani/i });
        const gujarat = await Mainboard.findOne({ companyName: /Gujarat Kidney/i });

        console.log("Shyam Dhani:");
        console.log("- Status:", shyam?.status);
        console.log("- Listing Date:", shyam?.listing_date);
        console.log("- isAllotmentOut:", shyam?.isAllotmentOut);

        console.log("\nGujarat Kidney:");
        console.log("- Status:", gujarat?.status);
        console.log("- Listing Date:", gujarat?.listing_date);
        console.log("- isAllotmentOut:", gujarat?.isAllotmentOut);

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

compare();
