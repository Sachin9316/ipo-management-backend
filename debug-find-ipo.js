
import mongoose from 'mongoose';
import Mainboard from './src/models/mainboard.model.js';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ipo-wizard");
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("DB Connection Error:", err.message);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    // Find IPO with approximately 626.35 Cr issue size
    // Using loose match or numeric match logic would be hard on 'issueSize' string
    // Let's try to match by max_price 384 and lot_size 39

    const ipos = await Mainboard.find({
        max_price: 384,
        lot_size: 39
    });

    console.log(`Found ${ipos.length} IPOs matching Criteria.`);

    ipos.forEach(ipo => {
        console.log(`\nCompany: ${ipo.companyName}`);
        console.log(`Min Price: ${ipo.min_price}`);
        console.log(`Max Price: ${ipo.max_price}`);
        console.log(`Issue Size: ${ipo.issueSize}`);
        console.log(`ID: ${ipo._id}`);
    });

    process.exit(0);
};

run();
