import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from '../models/mainboard.model.js';
import { cleanupOldIPOs } from '../services/scraper.service.js';

dotenv.config();

const verifyRetention = async () => {
    try {
        // Handle potentially different env var names
        const dbUrl = process.env.DB_URL || process.env.MONGODB_URI;
        if (!dbUrl) throw new undefined('DB_URL/MONGODB_URI not found in env');

        await mongoose.connect(dbUrl);
        console.log('Connected to MongoDB');

        // 1. Insert Dummy Old Record
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

        // Ensure unique slug
        const slug = "dummy-old-ipo-" + Date.now();

        const dummy = new Mainboard({
            companyName: "Dummy Old IPO",
            slug: slug,
            icon: "test.png",
            status: "CLOSED",
            open_date: oldDate,
            close_date: oldDate,
            listing_date: oldDate,
            refund_date: oldDate,
            allotment_date: oldDate,
            lot_size: 100,
            lot_price: 15000,
            isAllotmentOut: false
        });
        await dummy.save();
        console.log(`Inserted dummy old IPO: ${slug}`);

        // 2. Run Cleanup
        console.log('Running cleanup...');
        const deletedCount = await cleanupOldIPOs();
        console.log(`Cleanup function returned: Deleted ${deletedCount} records.`);

        // 3. Verify Deletion
        const check = await Mainboard.findOne({ slug: slug });
        if (!check) {
            console.log('SUCCESS: Dummy record deleted.');
        } else {
            console.log('FAILURE: Dummy record still exists.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Verification Error:', e);
        process.exit(1);
    }
};

verifyRetention();
