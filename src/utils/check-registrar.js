/**
 * Check registrar name for Gujarat Kidney IPO
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from '../models/mainboard.model.js';

dotenv.config();

const checkRegistrar = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to MongoDB');

        const ipo = await Mainboard.findOne({
            companyName: { $regex: 'gujarat.*kidney', $options: 'i' }
        });

        if (ipo) {
            console.log('\n📋 IPO Details:');
            console.log('Company Name:', ipo.companyName);
            console.log('Registrar Name:', ipo.registrarName);
            console.log('Registrar Link:', ipo.registrarLink);
            console.log('Registrar:', ipo.registrar);
        } else {
            console.log('IPO not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkRegistrar();
