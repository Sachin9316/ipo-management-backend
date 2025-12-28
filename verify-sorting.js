import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function verifySorting() {
    try {
        console.log(`Checking Sorting...`);

        // Check Listed IPOs
        console.log("\n--- Checking Listed IPOs (Expected: listing_date DESC) ---");
        const { data: listed } = await axios.get(`${API_BASE_URL}/listed/listed-ipos?limit=5`);
        const listedDates = listed.data.map(ipo => ({
            name: ipo.companyName,
            date: ipo.listing_date
        }));

        let listedSorted = true;
        for (let i = 0; i < listedDates.length - 1; i++) {
            if (new Date(listedDates[i].date) < new Date(listedDates[i + 1].date)) {
                listedSorted = false;
                break;
            }
        }
        console.log("Listed Dates:", listedDates.map(d => `${d.name} (${new Date(d.date).toISOString().split('T')[0]})`));
        console.log("Listed Sorted Correctly:", listedSorted);


        // Check Mainboard IPOs
        console.log("\n--- Checking Mainboard IPOs (Expected: open_date DESC) ---");
        const { data: mainboard } = await axios.get(`${API_BASE_URL}/mainboard/mainboards?limit=5`);
        const mainboardDates = mainboard.data.map(ipo => ({
            name: ipo.companyName,
            date: ipo.open_date
        }));

        let mainboardSorted = true;
        for (let i = 0; i < mainboardDates.length - 1; i++) {
            if (new Date(mainboardDates[i].date) < new Date(mainboardDates[i + 1].date)) {
                mainboardSorted = false;
                break;
            }
        }
        console.log("Mainboard Dates:", mainboardDates.map(d => `${d.name} (${new Date(d.date).toISOString().split('T')[0]})`));
        console.log("Mainboard Sorted Correctly:", mainboardSorted);

        // Check SME IPOs
        console.log("\n--- Checking SME IPOs (Expected: open_date DESC) ---");
        const { data: sme } = await axios.get(`${API_BASE_URL}/sme/sme-ipos?limit=5`);
        const smeDates = sme.data.map(ipo => ({
            name: ipo.companyName,
            date: ipo.open_date
        }));

        let smeSorted = true;
        for (let i = 0; i < smeDates.length - 1; i++) {
            if (new Date(smeDates[i].date) < new Date(smeDates[i + 1].date)) {
                smeSorted = false;
                break;
            }
        }
        console.log("SME Dates:", smeDates.map(d => `${d.name} (${new Date(d.date).toISOString().split('T')[0]})`));
        console.log("SME Sorted Correctly:", smeSorted);


        if (listedSorted && mainboardSorted && smeSorted) {
            console.log("\nSUCCESS: All endpoints returned sorted data!");
            process.exit(0);
        } else {
            console.log("\nFAILURE: Sorting incorrectly detected.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Verification failed:", error.message);
        process.exit(1);
    }
}

verifySorting();
