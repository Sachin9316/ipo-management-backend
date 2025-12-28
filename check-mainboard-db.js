import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function checkMainboardStatus() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        // Find Gujarat Kidney specifically
        const gujarat = await Mainboard.findOne({ companyName: /Gujarat Kidney/i });
        if (gujarat) {
            console.log("\n--- Gujarat Kidney Details ---");
            console.log(`Status: ${gujarat.status}`);
            console.log(`Open Date: ${gujarat.open_date}`);
            console.log(`Close Date: ${gujarat.close_date}`);
            console.log(`Listing Date: ${gujarat.listing_date}`);
            console.log(`GMP History:`, gujarat.gmp);
        } else {
            console.log("Gujarat Kidney not found");
        }

        // Find active Mainboard IPOs (Upcoming or Open or Closed but not Listed)
        const active = await Mainboard.find({
            ipoType: 'MAINBOARD',
            status: { $in: ['UPCOMING', 'OPEN', 'CLOSED'] }
        }).limit(5);

        console.log(`\n--- Active Mainboard IPOs (${active.length} found) ---`);
        active.forEach(ipo => {
            console.log(`${ipo.companyName} | Status: ${ipo.status} | GMP: ${ipo.gmp?.length ? ipo.gmp[ipo.gmp.length - 1].price : 'None'}`);
        });

        // Find Shyam Dhani for comparison
        const shyam = await Mainboard.findOne({ companyName: /Shyam Dhani/i });
        if (shyam) {
            console.log("\n--- Shyam Dhani (SME) Details ---");
            console.log(`Status: ${shyam.status}`);
            console.log(`GMP History:`, shyam.gmp);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkMainboardStatus();
