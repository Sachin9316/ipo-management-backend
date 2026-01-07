
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from '../src/models/mainboard.model.js';
import { getSimilarity } from '../src/utils/matching.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("Database connected.");
    } catch (error) {
        console.error("DB Error:", error);
        process.exit(1);
    }
};

const cleanup = async () => {
    await connectDB();

    console.log("Fetching all Mainboard IPOs...");
    const allIPOs = await Mainboard.find({}).sort({ createdAt: -1 }); // Newest first
    console.log(`Total IPOs: ${allIPOs.length}`);

    const processedIds = new Set();
    const actions = [];

    for (let i = 0; i < allIPOs.length; i++) {
        const current = allIPOs[i];
        if (processedIds.has(current._id.toString())) continue;

        // Compare with all subsequent IPOs
        for (let j = i + 1; j < allIPOs.length; j++) {
            const other = allIPOs[j];
            if (processedIds.has(other._id.toString())) continue;

            const score = getSimilarity(current.companyName, other.companyName);

            // Threshold 0.3 matches "AMC" to "Asset Management..."
            if (score > 0.3) {
                console.log(`\nPotential Duplicate Found (Score: ${score.toFixed(2)}):`);
                console.log(`1. [${current.status}] ${current.companyName} (ID: ${current._id})`);
                console.log(`2. [${other.status}] ${other.companyName} (ID: ${other._id})`);

                let toKeep = null;
                let toDelete = null;

                // PREFERENCE RULES:
                // 1. Prefer LISTED over CLOSED
                if (current.status === 'LISTED' && other.status === 'CLOSED') {
                    toKeep = current;
                    toDelete = other;
                } else if (other.status === 'LISTED' && current.status === 'CLOSED') {
                    toKeep = other;
                    toDelete = current;
                }
                // 2. If same status, keep the one with longer name? (Usually more descriptive)
                else if (current.companyName.length > other.companyName.length) {
                    toKeep = current;
                    toDelete = other;
                } else {
                    toKeep = other;
                    toDelete = current;
                }

                console.log(`>> RECOMMEND: Keep "${toKeep.companyName}" (${toKeep.status}), DELETE "${toDelete.companyName}" (${toDelete.status})`);

                actions.push({
                    keep: toKeep,
                    delete: toDelete,
                    score
                });

                // Mark as processed so we don't check them again
                // processedIds.add(current._id.toString()); // Don't mark current, might match multiple? No, pairs.
                processedIds.add(toDelete._id.toString());
                // We keeping 'toKeep' active to compare against others? 
                // Actually safer to process pairs.
            }
        }
    }

    console.log(`\n---------------------------------`);
    console.log(`Total Duplicate Pairs Found: ${actions.length}`);

    if (process.argv.includes('--delete')) {
        console.log("DELETING DUPLICATES...");
        for (const action of actions) {
            await Mainboard.findByIdAndDelete(action.delete._id);
            console.log(`Deleted: ${action.delete.companyName}`);
        }
        console.log("Deletion Complete.");
    } else {
        console.log("DRY RUN: No deletions performed. Run with --delete to execute.");
    }

    mongoose.connection.close();
};

cleanup();
