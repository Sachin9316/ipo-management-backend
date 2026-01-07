
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';
import AllotmentResult from './src/models/AllotmentResult.js';

dotenv.config({ path: 'IPO-Wizard-/.env' });
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sachin:Sachin%40123@cluster0.o82bu.mongodb.net/ipo-wizard?retryWrites=true&w=majority&appName=Cluster0";

const fixCache = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const ipoName = "SHYAM DHANI INDUSTRIES LIMITED";
        const pan = "AMYPU5615K";

        const ipo = await Mainboard.findOne({
            companyName: { $regex: "Shyam Dhani", $options: "i" }
        });

        if (!ipo) {
            console.log("IPO Not Found");
            return;
        }

        const result = await AllotmentResult.deleteOne({
            ipoId: ipo._id,
            panNumber: pan
        });

        console.log(`Deleted Count: ${result.deletedCount}`);
        if (result.deletedCount > 0) {
            console.log("Cache cleared successfully for this PAN.");
        } else {
            console.log("No cache record found to delete.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

fixCache();
