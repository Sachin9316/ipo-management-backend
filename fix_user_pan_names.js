
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';

dotenv.config();

const MONGO_URI = process.env.DB_URL;
if (!MONGO_URI) { console.error("Missing DB_URL in .env"); process.exit(1); }

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const users = await User.find({ "panDocuments.name": { $exists: false } }); // This query might not catch all array elements
        console.log("Scanning users...");

        // Better to iterate all users with panDocuments
        const allUsers = await User.find({ "panDocuments.0": { $exists: true } });

        let updateCount = 0;

        for (const user of allUsers) {
            let modified = false;
            user.panDocuments.forEach((doc, index) => {
                if (!doc.name) {
                    console.log(`User ${user.email}: PAN doc ${index} (${doc.panNumber}) missing name. Fixing...`);
                    doc.name = ""; // Set default
                    modified = true;
                }
            });

            if (modified) {
                // Bypass validation if needed, or hope fix allows save
                // To safely update without triggering other validations, we can use updateOne
                // But let's try save first as it's cleaner for Mongoose
                try {
                    // Update raw 
                    await User.updateOne(
                        { _id: user._id },
                        { $set: { panDocuments: user.panDocuments } }
                    );
                    console.log(`User ${user.email} updated.`);
                    updateCount++;
                } catch (err) {
                    console.error(`Failed to update user ${user.email}:`, err.message);
                }
            }
        }

        console.log(`Fixed ${updateCount} users.`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
