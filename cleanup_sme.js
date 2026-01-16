
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.DB_URL;
if (!MONGO_URI) { console.error("Missing DB_URL in .env"); process.exit(1); }

const mainboardSchema = new mongoose.Schema({
    companyName: String,
    slug: String,
    status: String,
    ipoType: String
}, { strict: false });

const Mainboard = mongoose.model('Mainboard', mainboardSchema);

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const targets = [
            { keeper: "indo-smc", duplicates: ["indo-smc-ltd-ipo-o", "indo-smc-ltd-ipo-ct"] }
        ];

        for (const target of targets) {
            console.log(`Processing group for keeper: ${target.keeper}`);

            const keeperDoc = await Mainboard.findOne({ slug: target.keeper });
            if (!keeperDoc) {
                console.log(`Keeper ${target.keeper} not found! Skipping group.`);
                continue;
            }

            for (const dupSlug of target.duplicates) {
                const dupDoc = await Mainboard.findOne({ slug: dupSlug });
                if (dupDoc) {
                    console.log(`Deleting duplicate: ${dupSlug} (${dupDoc.companyName})`);
                    await Mainboard.deleteOne({ _id: dupDoc._id });
                } else {
                    console.log(`Duplicate ${dupSlug} not found.`);
                }
            }
        }

        console.log("Cleanup complete.");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
