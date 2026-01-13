/**
 * Utility script to clear allotment results for a specific IPO
 * Run this when you need to clear contaminated cache data
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AllotmentResult from '../models/AllotmentResult.js';
import Mainboard from '../models/mainboard.model.js';

dotenv.config();

const clearAllotmentCache = async (ipoSlugOrName) => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to MongoDB');

        // Find the IPO
        const ipo = await Mainboard.findOne({
            $or: [
                { slug: ipoSlugOrName },
                { companyName: { $regex: ipoSlugOrName, $options: 'i' } }
            ]
        });

        if (!ipo) {
            console.log(`IPO not found: ${ipoSlugOrName}`);
            process.exit(1);
        }

        console.log(`Found IPO: ${ipo.companyName} (${ipo._id})`);

        // Delete all allotment results for this IPO
        const result = await AllotmentResult.deleteMany({ ipoId: ipo._id });

        console.log(`✅ Deleted ${result.deletedCount} allotment results for ${ipo.companyName}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

// Get IPO name from command line
const ipoName = process.argv[2];
if (!ipoName) {
    console.log('Usage: node clear-allotment-cache.js "IPO Name or Slug"');
    console.log('Example: node clear-allotment-cache.js "e-to-e-transportation"');
    process.exit(1);
}

clearAllotmentCache(ipoName);
