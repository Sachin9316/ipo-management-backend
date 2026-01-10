import axios from 'axios';
import fs from 'fs';

const fetchSubscriptionData = async () => {
    // Dynamic Date Logic
    const now = new Date();
    // For testing purposes, let's use the USER PROVIDED specific date/params to ensure it works first, 
    // or we can try to make it dynamic immediately. 
    // User URL: https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/1/2026/2025/0/0/0?search=&v=21-21
    // It seems: Month=1, Year=2026, FY=2025?

    // Let's try to replicate the user's URL exactly first to confirm data
    const url = "https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/1/2026/2025/0/0/0?search=&v=21-21";

    console.log(`Fetching from: ${url}`);

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.chittorgarh.com/'
            }
        });

        console.log("Response Status:", "Success");

        if (data && data.reportTableData) {
            console.log(`Found ${data.reportTableData.length} records.`);
            // Log the first item to see the structure keys
            if (data.reportTableData.length > 0) {
                console.log("Sample Record Structure:", JSON.stringify(data.reportTableData[0], null, 2));
            }

            // Helpful summary of keys user asked for
            const sample = data.reportTableData[0];
            if (sample) {
                console.log("\n--- Data Mapping Check ---");
                console.log("Company Name:", sample['Company Name']);
                console.log("QIB:", sample['QIB (x)']);
                console.log("NII:", sample['NII (x)']); // Usually total NII?
                console.log("sNII:", sample['sNII (x)']);
                console.log("bNII:", sample['bNII (x)']);
                console.log("Retail:", sample['Retail (x)']);
                console.log("Employee:", sample['Employee (x)']);
                console.log("Shareholders:", sample['Shareholder (x)'] || "Not Found directly?");
                console.log("Total:", sample['Total (x)']);
                console.log("Applications:", sample['Applications']);
            }

            console.log("\nFull JSON Response saved to api_response.json");
            fs.writeFileSync('api_response.json', JSON.stringify(data.reportTableData, null, 2));
        } else {
            console.log("No 'reportTableData' found in response:", data);
        }

    } catch (error) {
        console.error("Error fetching API:", error.message);
    }
};

fetchSubscriptionData();
