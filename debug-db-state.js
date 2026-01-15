
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';

dotenv.config();

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("Connected to DB");

        const ipo = await Mainboard.findOne({ companyName: { $regex: "Bharat Coking", $options: "i" } });
        if (ipo) {
            console.log("Found IPO:");
            console.log(`Name: ${ipo.companyName}`);
            console.log(`Status: ${ipo.status}`);
            console.log(`Open Date: ${ipo.open_date}`);
            console.log(`Close Date: ${ipo.close_date}`);
            console.log(`Listing Date: ${ipo.listing_date}`);
            console.log(`UpdatedAt: ${ipo.updatedAt}`);
        } else {
            console.log("IPO Not Found");
        }
        await mongoose.connection.close();
    } catch (error) {
        console.error(error);
    }
};

checkDB();
