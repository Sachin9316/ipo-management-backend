import mongoose from "mongoose";

const allotmentResultSchema = new mongoose.Schema(
    {
        ipoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Mainboard",
            required: true,
        },
        panNumber: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["ALLOTTED", "NOT_ALLOTTED", "NOT_APPLIED", "ERROR", "UNKNOWN"],
            required: true,
        },
        units: {
            type: Number,
            default: 0,
        },
        message: {
            type: String,
            default: "",
        },
        lastChecked: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Compound index for fast lookup
allotmentResultSchema.index({ ipoId: 1, panNumber: 1 }, { unique: true });

const AllotmentResult = mongoose.model("AllotmentResult", allotmentResultSchema);

export default AllotmentResult;
