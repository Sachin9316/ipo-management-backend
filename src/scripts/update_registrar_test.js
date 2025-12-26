import mongoose from 'mongoose';
import Mainboard from '../models/Mainboard.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);

        // Update first IPO to have a registrar
        const ipo = await Mainboard.findOne();
        if (ipo) {
            ipo.registrarName = "Link Intime India Private Ltd";
            await ipo.save();
            console.log(`UPDATED_IPO_ID=${ipo._id}`);
            console.log(`Updated ${ipo.companyName} with Registrar: ${ipo.registrarName}`);
        } else {
            console.log("No IPO found to update.");
        }

        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};
dbConnect();
