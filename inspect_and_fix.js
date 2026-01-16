
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

        const user = await User.findOne({ email: "su9206407@gmail.com" });
        if (!user) {
            console.log("User not found!");
            return;
        }

        console.log(`User found: ${user.name}`);
        console.log(`PAN Documents count: ${user.panDocuments.length}`);

        user.panDocuments.forEach((doc, i) => {
            console.log(`[${i}] Number: ${doc.panNumber} | Name: "${doc.name}" | Status: ${doc.status}`);
            if (!doc.name || doc.name.trim() === "") {
                console.log(`    >>> MISSING NAME AT INDEX ${i}`);
            }
        });

        // Force fix via Mongoose updateOne (bypasses schema validation)
        let needsFix = false;
        const newDocs = user.panDocuments.map(doc => {
            if (!doc.name || doc.name.trim() === "") {
                needsFix = true;
                doc.name = "Unknown"; // Valid string
            }
            return doc;
        });

        if (needsFix) {
            console.log("Applying fix via updateOne...");
            await User.updateOne(
                { _id: user._id },
                { $set: { panDocuments: newDocs } },
                { runValidators: false }
            );
            console.log("Fix applied.");
        } else {
            console.log("No issues found in inspection.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
