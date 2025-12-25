import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './models/mainboard.model.js';
import dbConnect from './config/db.js';

dotenv.config();

const updateZomato = async () => {
    try {
        await dbConnect();
        console.log('Connected to DB');

        const companyName = 'Zomato Limited';

        // Find Zomato
        const ipo = await Mainboard.findOne({ companyName });

        if (!ipo) {
            console.error('Zomato IPO not found!');
            process.exit(1);
        }

        console.log('Found Zomato:', ipo.companyName);

        // Update Subscription Data
        ipo.subscription = {
            qib: 51.79,
            nii: 32.96,
            retail: 7.45,
            employee: 0.62,
            total: 38.25
        };

        await ipo.save();
        console.log('Updated subscription data for Zomato');

        process.exit(0);
    } catch (error) {
        console.error('Error updating Zomato:', error);
        process.exit(1);
    }
};

updateZomato();
