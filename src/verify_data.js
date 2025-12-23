
import mongoose from "mongoose";
import dotenv from "dotenv";
import Mainboard from "./models/mainboard.model.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const verify = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("Connected.");

        const counts = await Mainboard.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        console.log("Counts by Status:", counts);

        const upcoming = await Mainboard.findOne({ status: "UPCOMING" });
        console.log("Sample UPCOMING:", upcoming ? upcoming.status : "None");

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
verify();
