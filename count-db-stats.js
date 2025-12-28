import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';

dotenv.config();
const DB_URL = process.env.DB_URL;

async function countIPOs() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");

        const totals = await Mainboard.aggregate([
            {
                $group: {
                    _id: { type: "$ipoType", status: "$status" },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log("\n--- IPO Counts ---");
        totals.forEach(t => {
            console.log(`${t._id.type} - ${t._id.status}: ${t.count}`);
        });

        // List specific ones for sanity check
        const recent = await Mainboard.find().sort({ updatedAt: -1 }).limit(5);
        console.log("\n--- Recently Updated ---");
        recent.forEach(i => console.log(`${i.companyName} (${i.ipoType}) - ${i.status}`));

        mongoose.disconnect();
    } catch (error) {
        console.error("Count Failed:", error);
    }
}

countIPOs();
