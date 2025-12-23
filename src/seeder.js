
import mongoose from "mongoose";
import dotenv from "dotenv";
import Mainboard from "./models/mainboard.model.js";
import User from "./models/User.model.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DB_URL);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// --- Data Generators ---

const generateRandomString = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const generateRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateIndianName = () => {
    const firstNames = ["Aarav", "Vihaan", "Aditya", "Sai", "Reyansh", "Diya", "Ananya", "Saanvi", "Aadhya", "Pari"];
    const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Singh", "Patel", "Kumar", "Das", "Rao", "Nair"];
    return `${firstNames[generateRandomNumber(0, 9)]} ${lastNames[generateRandomNumber(0, 9)]}`;
};

const generatePAN = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    let pan = "";
    for (let i = 0; i < 5; i++) pan += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) pan += nums.charAt(Math.floor(Math.random() * nums.length));
    pan += chars.charAt(Math.floor(Math.random() * chars.length));
    return pan;
};

// --- Seed Logic ---

const seedData = async () => {
    await connectDB();

    console.log("Adding Seed Data...");

    try {
        // 1. Wipe Data (Preserve Admins)
        await Mainboard.deleteMany({});
        await User.deleteMany({ role: { $nin: ["admin", "superadmin"] } });

        console.log("Old data cleared (except admins).");

        // 2. Create 50 Users
        const users = [];
        for (let i = 0; i < 50; i++) {
            const name = generateIndianName();
            const email = `${name.split(' ')[0].toLowerCase()}${generateRandomNumber(100, 999)}@example.com`;

            const panDocs = [];
            const numPans = generateRandomNumber(0, 3);
            for (let j = 0; j < numPans; j++) {
                panDocs.push({
                    panNumber: generatePAN(),
                    nameOnPan: name,
                    status: ["PENDING", "VERIFIED", "REJECTED"][generateRandomNumber(0, 2)],
                    documentUrl: "https://example.com/fake-pan.pdf"
                });
            }

            users.push({
                name,
                email,
                password: "password123",
                phoneNumber: `9${generateRandomNumber(100000000, 999999999)}`,
                isVerified: true,
                panDocuments: panDocs
            });
        }

        for (let i = 0; i < users.length; i += 10) {
            await User.create(users.slice(i, i + 10));
        }
        console.log("Created 50 Users");


        // 3. Create IPOs with random type assignment
        const statuses = ["UPCOMING", "OPEN", "CLOSED", "LISTED"];
        const ipos = [];

        // Generate 52 IPOs per status (208 total) with random type assignment
        for (const status of statuses) {
            for (let i = 0; i < 52; i++) {
                // 70% chance MAINBOARD, 30% chance SME
                const ipoType = Math.random() < 0.7 ? "MAINBOARD" : "SME";
                const isSME = ipoType === "SME";

                const companyName = isSME
                    ? `${generateRandomString(5).toUpperCase()} SME Ltd`
                    : `${generateRandomString(5).toUpperCase()} Tech Ltd`;

                const openDate = new Date();
                openDate.setDate(openDate.getDate() + generateRandomNumber(-30, 30));

                const closeDate = new Date(openDate);
                closeDate.setDate(closeDate.getDate() + 3);

                const listingDate = new Date(closeDate);
                listingDate.setDate(listingDate.getDate() + 7);

                // SME IPOs have lower prices
                const price = isSME
                    ? generateRandomNumber(50, 500)
                    : generateRandomNumber(100, 2000);

                const gmp = [];
                const gmpRange = isSME ? [5, 100] : [10, 500];
                for (let k = 0; k < 5; k++) {
                    gmp.push({
                        price: generateRandomNumber(gmpRange[0], gmpRange[1]),
                        kostak: generateRandomNumber(isSME ? 50 : 100, isSME ? 200 : 500).toString(),
                        date: new Date(new Date().setDate(new Date().getDate() - k))
                    });
                }

                let listingInfo = {};
                if (status === "LISTED") {
                    const gainRange = isSME ? [-20, 200] : [-50, 500];
                    const lPrice = price + generateRandomNumber(gainRange[0], gainRange[1]);
                    listingInfo = {
                        listing_price: lPrice,
                        listing_gain: lPrice - price,
                        day_high: lPrice + (isSME ? 20 : 50),
                        day_low: lPrice - (isSME ? 10 : 20)
                    };
                }

                ipos.push({
                    companyName,
                    slug: companyName.toLowerCase().replace(/ /g, "-") + (isSME ? "-sme-" : "-") + generateRandomNumber(100, 999),
                    icon: "https://via.placeholder.com/150",
                    ipoType,
                    status,
                    open_date: openDate,
                    close_date: closeDate,
                    listing_date: listingDate,
                    refund_date: new Date(listingDate),
                    allotment_date: new Date(listingDate),
                    lot_size: isSME ? generateRandomNumber(5, 50) : generateRandomNumber(10, 100),
                    lot_price: price,
                    bse_code_nse_code: generateRandomString(6).toUpperCase(),
                    isAllotmentOut: status === "LISTED" || status === "CLOSED",

                    subscription: {
                        qib: generateRandomNumber(1, isSME ? 50 : 150),
                        nii: generateRandomNumber(1, isSME ? 40 : 100),
                        retail: generateRandomNumber(1, isSME ? 30 : 50),
                        employee: generateRandomNumber(0, isSME ? 5 : 10),
                        total: generateRandomNumber(isSME ? 3 : 5, isSME ? 100 : 300)
                    },

                    gmp,

                    financials: {
                        revenue: generateRandomNumber(isSME ? 10 : 100, isSME ? 100 : 1000),
                        profit: generateRandomNumber(isSME ? 1 : 10, isSME ? 20 : 200),
                        eps: generateRandomNumber(isSME ? 1 : 5, isSME ? 10 : 50),
                        valuation: isSME ? "Fair Value" : "Undervalued"
                    },

                    rhp_pdf: `https://www.sebi.gov.in/sebi_data/attachdocs/${isSME ? 'sme-' : ''}12345.pdf`,
                    drhp_pdf: `https://www.sebi.gov.in/sebi_data/attachdocs/${isSME ? 'sme-' : ''}67890.pdf`,

                    listing_info: listingInfo
                });
            }
        }

        await Mainboard.insertMany(ipos);
        const mainboardCount = ipos.filter(ipo => ipo.ipoType === "MAINBOARD").length;
        const smeCount = ipos.filter(ipo => ipo.ipoType === "SME").length;
        console.log(`Created ${mainboardCount} Mainboard IPOs and ${smeCount} SME IPOs (Total: ${ipos.length})`);

        console.log("Seeding Completed Successfully!");
        process.exit();

    } catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
};

seedData();
