import { scrapeAndSaveSmeIPOs } from './src/services/scraper.service.js';
import Registrar from './src/models/Registrar.js';
import Mainboard from './src/models/mainboard.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const verifyRegistrarAutoAdd = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.DB_URL);
        console.log("Connected to DB");

        // 1. Delete a registrar to simulate a new one (Maashitla is common for SMEs)
        const targetName = "Maashitla Securities Private Limited";
        // Also delete variations to test matching
        await Registrar.deleteMany({ name: /Maashitla/i });
        console.log("Deleted old Maashitla records to test auto-add.");

        // 2. Run sync for an IPO that uses this registrar (Victory Electric is one)
        console.log("Running SME sync (limit 15 to catch Victory)...");
        await scrapeAndSaveSmeIPOs(15);

        // 3. Verify registrar was added
        const newReg = await Registrar.findOne({ name: /Maashitla/i });
        if (newReg) {
            console.log(`SUCCESS: Registrar auto-added! Name: ${newReg.name}, Link: ${newReg.websiteLink}`);
        } else {
            console.log("FAILURE: Registrar not found in DB after sync.");
        }

        // 4. Verify IPO record is updated
        const ipo = await Mainboard.findOne({ companyName: /Victory Electric/i });
        if (ipo) {
            console.log(`IPO Updated: ${ipo.companyName}, Registrar: ${ipo.registrarName}`);
            if (ipo.registrarName !== "N/A" && ipo.registrarName !== "-") {
                console.log("SUCCESS: IPO has a valid registrar name.");
            }
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

verifyRegistrarAutoAdd();
