
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("DB Connected");

        const result = await Mainboard.updateOne(
            { companyName: { $regex: "Bharat Coking", $options: "i" } },
            { $set: { status: "CLOSED" } }
        );

        console.log("Update Result:", result);

        await mongoose.connection.close();
    } catch (error) {
        console.error(error);
    }
};

run();
