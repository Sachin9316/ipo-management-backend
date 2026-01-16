
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.DB_URL || "mongodb+srv://su9206407_db_user:sach%409316@cluster0.pzmdcdv.mongodb.net/ultimate-ipo-backend";

const mainboardSchema = new mongoose.Schema({
    companyName: String,
    slug: String,
    status: String,
    subscription: Object
}, { strict: false });

const Mainboard = mongoose.model('Mainboard', mainboardSchema);

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const ipos = await Mainboard.find({ companyName: /Shadowfax/i });
        console.log(`Found ${ipos.length} IPOs matching 'Shadowfax':`);

        ipos.forEach(ipo => {
            console.log(`- Name: ${ipo.companyName}, Slug: ${ipo.slug}, Status: ${ipo.status}, Sub Total: ${ipo.subscription?.total}`);
        });

        // Cleanup logic
        const target = "shadowfax";
        const keeper = "shadowfax-technologies-ltd";

        const toDelete = ipos.find(i => i.slug === target);
        const toKeep = ipos.find(i => i.slug === keeper);

        if (toDelete && toKeep) {
            console.log(`Deleting duplicate: ${toDelete.slug}`);
            await Mainboard.deleteOne({ _id: toDelete._id });
            console.log("Deleted.");
        } else if (ipos.length > 1) {
            console.log("Multiple found but slugs didn't match expected specific ones. Please check output above.");
        } else {
            console.log("No obvious duplicates to delete.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
