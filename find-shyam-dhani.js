import dbConnect from './src/config/db.js';
import Mainboard from './src/models/mainboard.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function findIPO() {
    try {
        await dbConnect();
        const ipo = await Mainboard.findOne({ companyName: /Shyam Dhani/i });
        if (ipo) {
            console.log("Found IPO:");
            console.dir(ipo.toObject(), { depth: null });
        } else {
            console.log("Shyam Dhani IPO not found in Mainboard collection.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error finding IPO:", error);
        process.exit(1);
    }
}

findIPO();
