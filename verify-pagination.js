import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function verify() {
    try {
        console.log(`Checking SME IPOs from ${API_BASE_URL}/sme/sme-ipos...`);
        const { data } = await axios.get(`${API_BASE_URL}/sme/sme-ipos`);

        console.log("Success:", data.success);
        console.log("Total Items returned:", data.data.length);
        console.log("Pagination info:", data.pagination);

        const shyamDhani = data.data.find(ipo => ipo.companyName.includes('Shyam Dhani'));
        if (shyamDhani) {
            console.log("SUCCESS: Shyam Dhani found in the list!");
        } else {
            console.log("FAILURE: Shyam Dhani still not found in the first page.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error.message);
        process.exit(1);
    }
}

verify();
