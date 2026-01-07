
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './src/models/mainboard.model.js';
import AllotmentResult from './src/models/AllotmentResult.js';

dotenv.config({ path: 'IPO-Wizard-/.env' });

// Fallback if .env is in a different place or not loaded correctly manually
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sachin:Sachin%40123@cluster0.o82bu.mongodb.net/ipo-wizard?retryWrites=true&w=majority&appName=Cluster0";

const inspectRecord = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const ipoName = "SHYAM DHANI INDUSTRIES LIMITED";
        const pan = "AMYPU5615K";

        // Find IPO
        // Note: The controller logic uses findOne with $or companyName or slug. 
        // We need to be careful to match what the controller finds.
        // But for debugging, let's try to find it loosely.
        const ipo = await Mainboard.findOne({
            companyName: { $regex: "Shyam Dhani", $options: "i" }
        });

        if (!ipo) {
            console.log("IPO Not Found in DB");
            return;
        }
        console.log(`Found IPO: ${ipo.companyName} (_id: ${ipo._id})`);

        // Find Result
        const result = await AllotmentResult.findOne({
            ipoId: ipo._id,
            panNumber: pan
        });

        if (!result) {
            console.log("No Allotment Result found for this PAN/IPO");
        } else {
            console.log("Found Result:");
            console.log(JSON.stringify(result, null, 2));

            // Calculate TTL validity to see why it might be cached
            const TTL = {
                ALLOTTED: 24 * 60 * 60 * 1000,
                NOT_ALLOTTED: 24 * 60 * 60 * 1000,
                UNKNOWN: 45 * 60 * 1000,
                ERROR: 15 * 60 * 1000
            };
            const now = Date.now();
            const age = now - new Date(result.lastChecked).getTime();
            const limit = TTL[result.status] || TTL.UNKNOWN;

            console.log(`\nAge: ${age}ms`);
            console.log(`Limit: ${limit}ms`);
            console.log(`Is Cached in code? ${age < limit}`);
            console.log(`Message Check: includes 'Registrar not supported'? ${result.message?.includes("Registrar not supported")}`);
            console.log(`Message Check: includes 'IPO not found'? ${result.message?.includes("IPO not found")}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

inspectRecord();
