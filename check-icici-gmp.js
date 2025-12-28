import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function checkICICI() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        const icici = await Mainboard.findOne({ companyName: /ICICI Prudential/i });
        if (icici) {
            console.log("\n--- ICICI Prudential Details ---");
            console.log(`Status: ${icici.status}`);
            console.log(`Price Range: ${icici.min_price} - ${icici.max_price}`);
            console.log(`GMP History (Last 5):`, icici.gmp.slice(-5));
            // Check if last GMP ~= Max Price
            const lastGmp = icici.gmp[icici.gmp.length - 1]?.price;
            if (lastGmp === icici.max_price) {
                console.log("ALERT: GMP equals Max Price! Data is incorrect.");
            } else {
                console.log("GMP seems different from Price.");
            }
        } else {
            console.log("ICICI Prudential not found");
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkICICI();
