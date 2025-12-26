import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Registrar from '../models/Registrar.js';

dotenv.config();

const registrars = [
    {
        name: "Link Intime India Private Ltd",
        websiteLink: "https://linkintime.co.in/initial_offer/public-issues.html",
        description: "Leading registrar for Mainboard IPOs",
        logo: ""
    },
    {
        name: "KFin Technologies Limited",
        websiteLink: "https://ipostatus.kfintech.com/",
        description: "Major registrar for large-cap and Mainboard IPOs",
        logo: ""
    },
    {
        name: "Bigshare Services Pvt Ltd",
        websiteLink: "https://www.bigshareonline.com/ipo_Allotment.html",
        description: "Prominent registrar for SME and Mainboard IPOs",
        logo: ""
    },
    {
        name: "Skyline Financial Services Private Ltd",
        websiteLink: "https://www.skylinerta.com/ipo.php",
        description: "Active registrar in the SME segment",
        logo: ""
    },
    {
        name: "Maashitla Securities Pvt Ltd",
        websiteLink: "https://maashitla.com/allotment-status/public-issues",
        description: "Specialized registrar for SME IPOs",
        logo: ""
    },
    {
        name: "Cameo Corporate Services Limited",
        websiteLink: "https://ipo.cameoindia.com/",
        description: "Established registrar service provider",
        logo: ""
    },
    {
        name: "Purva Sharegistry (India) Pvt Ltd",
        websiteLink: "https://purvashare.com/investor-service/ipo-query",
        description: "Leading RTA for SME IPOs",
        logo: ""
    },
    {
        name: "Beetal Financial & Computer Services (P) Ltd",
        websiteLink: "https://beetalfinancial.com/",
        description: "Financial services and registrar company",
        logo: ""
    },
    {
        name: "Datamatics Business Solutions Ltd",
        websiteLink: "https://www.datamatics.com/investors/shareholder-s",
        description: "Business process management and registrar services",
        logo: ""
    }
];

const seedRegistrars = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('Database connected successfully.');

        for (const registrar of registrars) {
            await Registrar.findOneAndUpdate(
                { name: registrar.name },
                registrar,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`Seeded: ${registrar.name}`);
        }

        console.log('All registrars have been seeded.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedRegistrars();
