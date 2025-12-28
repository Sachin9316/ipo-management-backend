import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function repairGMP() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB. Scanning for incorrect GMP...");

        const ipos = await Mainboard.find({
            ipoType: 'MAINBOARD',
            status: 'LISTED'
        });

        let fixedCount = 0;

        for (const ipo of ipos) {
            if (!ipo.gmp || ipo.gmp.length === 0) continue;

            const latestGmp = ipo.gmp[ipo.gmp.length - 1];
            // Check if GMP matches Max Price (or Min Price)
            // Or if GMP is unreasonably high (> 50% of price is rare for mainboard these days, but == price is definite bug)
            // We use fuzzy match (within 1 rupee incase of formatting diffs)

            const isBadData = Math.abs(latestGmp.price - ipo.max_price) < 5 || Math.abs(latestGmp.price - ipo.min_price) < 5;

            if (isBadData) {
                console.log(`Fixing ${ipo.companyName}: GMP ${latestGmp.price} == Price ${ipo.max_price}`);

                // Fix strategy: Set to 0 (as listed IPOs usually have 0 GMP effectively after listing)
                // Or remove the bad entry? 
                // Setting to 0 is safer to "clear" the confusion.

                ipo.gmp.push({
                    price: 0,
                    kostak: "0",
                    date: new Date()
                });

                await ipo.save();
                fixedCount++;
            }
        }

        console.log(`\nRepair Complete. Fixed ${fixedCount} IPOs.`);
        mongoose.disconnect();
    } catch (error) {
        console.error("Repair Failed:", error);
    }
}

repairGMP();
