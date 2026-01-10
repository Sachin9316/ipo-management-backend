import axios from 'axios';
import fs from 'fs';

const checkReport82 = async () => {
    // Report 82 URL (Mainboard List API)
    // Using current params: 2026/2025-26? 
    // Usually it's current year. Let's try 2025 first as most data is there or 2026.
    const url = "https://webnodejs.chittorgarh.com/cloud/report/data-read/82/1/1/2025/2024-25/0/all/0?search=&v=16-05";
    // Note: User provided 2026/2025 url for subs. 
    // Let's try to see if we can get recent ones.

    console.log(`Fetching Report 82 from: ${url}`);

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        if (data && data.reportTableData && data.reportTableData.length > 0) {
            console.log(`Found ${data.reportTableData.length} records.`);
            const sample = data.reportTableData[0];
            console.log("\nSample Record Keys:");
            console.log(Object.keys(sample));
            console.log("\nSample Record Data:");
            console.log(JSON.stringify(sample, null, 2));

            fs.writeFileSync('report82_sample.json', JSON.stringify(data.reportTableData.slice(0, 5), null, 2));
            console.log("\nSaved first 5 records to report82_sample.json");
        } else {
            console.log("No data found or empty reportTableData.");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
};

checkReport82();
