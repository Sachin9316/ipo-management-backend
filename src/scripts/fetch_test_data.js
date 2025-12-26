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

        // Find top 5 IPOs
        const ipos = await Mainboard.find({}).limit(5);

        ipos.forEach(ipo => {
            console.log(`ID: ${ipo._id} | Name: ${ipo.companyName} | Registrar: '${ipo.registrarName}'`);
        });

        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};
dbConnect();
