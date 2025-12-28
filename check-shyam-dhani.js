import dbConnect from './src/config/db.js';
import Mainboard from './src/models/mainboard.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function findIPO() {
    try {
        await dbConnect();
        const ipo = await Mainboard.findOne({ companyName: /Shyam Dhani/i });
        if (ipo) {
            console.log("IPO details for categorization:");
            console.log("Company Name:", ipo.companyName);
            console.log("Status:", ipo.status);
            console.log("IPO Type:", ipo.ipoType);
            console.log("Is Allotment Out:", ipo.isAllotmentOut);
            console.log("Listing Date:", ipo.listing_date);
        } else {
            console.log("Shyam Dhani IPO not found.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error finding IPO:", error);
        process.exit(1);
    }
}

findIPO();
