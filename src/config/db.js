import mongoose from "mongoose";

const dbConnect = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
}

export default dbConnect;