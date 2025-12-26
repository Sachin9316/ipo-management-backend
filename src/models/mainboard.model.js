import mongoose from "mongoose";

const mainboardSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, required: true },
    ipoType: { type: String, enum: ["MAINBOARD", "SME"], default: "MAINBOARD" },
    status: { type: String, required: true },
    gmp: [
        {
            price: { type: Number },
            kostak: { type: String },
            date: { type: Date, default: Date.now },
        }
    ],
    subscription: {
        qib: { type: Number, default: 0 },
        nii: { type: Number, default: 0 },
        bnii: { type: Number, default: 0 }, // HNI (>10L)
        snii: { type: Number, default: 0 }, // SNI (<10L)
        retail: { type: Number, default: 0 },
        employee: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
    },
    open_date: { type: Date, required: true },
    close_date: { type: Date, required: true },
    listing_date: { type: Date, required: true },
    refund_date: { type: Date, required: true },
    allotment_date: { type: Date, required: true },
    registrarName: { type: String },
    registrarLink: { type: String },
    lot_size: { type: Number, required: true },
    lot_price: { type: Number, required: true },
    min_price: { type: Number },
    max_price: { type: Number },
    bse_code_nse_code: { type: String, required: true },
    isAllotmentOut: { type: Boolean, required: true },
    rhp_pdf: { type: String },
    drhp_pdf: { type: String },
    financials: {
        revenue: { type: Number },
        profit: { type: Number },
        eps: { type: Number },
        valuation: { type: String }
    },
    swot: {
        strengths: { type: [String] },
        weaknesses: { type: [String] },
        opportunities: { type: [String] },
        threats: { type: [String] }
    },
    listing_info: {
        listing_price: { type: Number },
        listing_gain: { type: Number },
        day_high: { type: Number },
        day_low: { type: Number }
    }
}, {
    timestamps: true,
});

const Mainboard = mongoose.models.Mainboard || mongoose.model("Mainboard", mainboardSchema);
export default Mainboard;