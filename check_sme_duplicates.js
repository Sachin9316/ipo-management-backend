
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.DB_URL || "mongodb+srv://su9206407_db_user:sach%409316@cluster0.pzmdcdv.mongodb.net/ultimate-ipo-backend";

const mainboardSchema = new mongoose.Schema({
    companyName: String,
    slug: String,
    status: String,
    ipoType: String,
    source: String
}, { strict: false });

const Mainboard = mongoose.model('Mainboard', mainboardSchema);

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const ipos = await Mainboard.find({ companyName: /INDO SMC/i });
        console.log(`Found ${ipos.length} IPOs matching 'INDO SMC':`);

        ipos.forEach(ipo => {
            console.log(`- Name: "${ipo.companyName}"`);
            console.log(`  Slug: ${ipo.slug}`);
            console.log(`  Type: ${ipo.ipoType}`);
            console.log(`  Status: ${ipo.status}`);
            console.log(`  Source: ${ipo.source || 'Unknown'}`);
            console.log('---');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
