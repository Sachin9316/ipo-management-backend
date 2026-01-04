import mongoose from "mongoose";

const setTwoDecimal = (val) => {
    if (typeof val === 'number') {
        return Math.round(val * 100) / 100;
    }
    return val;
};

const mainboardSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, required: true },
    ipoType: { type: String, enum: ["MAINBOARD", "SME"], default: "MAINBOARD" },
    status: { type: String, required: true },
    gmp: [
        {
            price: { type: Number, set: setTwoDecimal },
            kostak: { type: String },
            date: { type: Date, default: Date.now },
        }
    ],
    issueSize: { type: String },
    subscription: {
        qib: { type: Number, default: 0, set: setTwoDecimal },
        nii: { type: Number, default: 0, set: setTwoDecimal },
        bnii: { type: Number, default: 0, set: setTwoDecimal }, // HNI (>10L)
        snii: { type: Number, default: 0, set: setTwoDecimal }, // SNI (<10L)
        retail: { type: Number, default: 0, set: setTwoDecimal },
        employee: { type: Number, default: 0, set: setTwoDecimal },
        total: { type: Number, default: 0, set: setTwoDecimal },
    },
    open_date: { type: Date, required: true },
    close_date: { type: Date, required: true },
    listing_date: { type: Date, required: true },
    refund_date: { type: Date, required: true },
    allotment_date: { type: Date, required: true },
    registrarName: { type: String },
    registrarLink: { type: String },
    lot_size: { type: Number, required: true },
    lot_price: { type: Number, required: true, set: setTwoDecimal },
    min_price: { type: Number, set: setTwoDecimal },
    max_price: { type: Number, set: setTwoDecimal },
    isAllotmentOut: { type: Boolean, required: true },
    rhp_pdf: { type: String },
    drhp_pdf: { type: String },
    financials: {
        revenue: { type: Number, set: setTwoDecimal },
        profit: { type: Number, set: setTwoDecimal },
        eps: { type: Number, set: setTwoDecimal },
        valuation: { type: String }
    },
    swot: {
        strengths: { type: [String] },
        weaknesses: { type: [String] },
        opportunities: { type: [String] },
        threats: { type: [String] }
    },
    listing_info: {
        listing_price: { type: Number, set: setTwoDecimal },
        listing_gain: { type: Number, set: setTwoDecimal },
        day_high: { type: Number, set: setTwoDecimal },
        day_low: { type: Number, set: setTwoDecimal }
    }
}, {
    timestamps: true,
});

const Mainboard = mongoose.models.Mainboard || mongoose.model("Mainboard", mainboardSchema);
export default Mainboard;