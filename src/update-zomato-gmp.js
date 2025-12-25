import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './models/mainboard.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.DB_URL || "mongodb://127.0.0.1:27017/ipo-wizard";

async function updateZomatoGMP() {
    try {
        console.log('Using DB_URL:', MONGO_URI.replace(/:([^:@]+)@/, ':****@')); // Mark password
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const companyName = "Zomato Limited";
        const ipo = await Mainboard.findOne({ companyName });

        if (!ipo) {
            console.log(`IPO "${companyName}" not found.`);
            return;
        }

        console.log(`Found IPO: ${ipo.companyName}`);

        // Update with sample GMP history
        // Simulating a more complex trend
        const gmpData = [
            { date: new Date(Date.now() - 14 * 86400000), price: 5, kostak: "50" },
            { date: new Date(Date.now() - 13 * 86400000), price: 8, kostak: "80" },
            { date: new Date(Date.now() - 12 * 86400000), price: 7, kostak: "70" },
            { date: new Date(Date.now() - 11 * 86400000), price: 10, kostak: "100" },
            { date: new Date(Date.now() - 10 * 86400000), price: 12, kostak: "120" },
            { date: new Date(Date.now() - 9 * 86400000), price: 15, kostak: "150" },
            { date: new Date(Date.now() - 8 * 86400000), price: 18, kostak: "180" },
            { date: new Date(Date.now() - 7 * 86400000), price: 16, kostak: "160" },
            { date: new Date(Date.now() - 6 * 86400000), price: 20, kostak: "200" },
            { date: new Date(Date.now() - 5 * 86400000), price: 25, kostak: "250" },
            { date: new Date(Date.now() - 4 * 86400000), price: 28, kostak: "280" },
            { date: new Date(Date.now() - 3 * 86400000), price: 35, kostak: "350" },
            { date: new Date(Date.now() - 2 * 86400000), price: 32, kostak: "320" },
            { date: new Date(Date.now() - 1 * 86400000), price: 40, kostak: "400" },
            { date: new Date(), price: 45, kostak: "450" },
        ];

        ipo.gmp = gmpData;
        ipo.isAllotmentOut = true; // Enable allotment check
        await ipo.save();

        console.log('Successfully updated GMP details and Allotment Status for Zomato Limited.');
        console.log(ipo.gmp);

    } catch (error) {
        console.error('Error updating GMP:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

updateZomatoGMP();
