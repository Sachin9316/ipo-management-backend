import axios from 'axios';

// URLs for Mainboard (21) and SME (22) subscription data
// We need to dynamically set the month/year parts of the URL to ensure it works for current data
const getYear = () => new Date().getFullYear();
const getMonth = () => new Date().getMonth() + 1; // 1-12
const getFinancialYear = () => {
    const year = new Date().getFullYear();
    // Consistent with List Service: always standard Year-NextYear format
    return `${year}-${(year + 1).toString().slice(-2)}`;
};

const MAINBOARD_URL_TEMPLATE = (month, year, fy) => `https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/${month}/${year}/${fy}/0/0/0?search=&v=21-21`;
const SME_URL_TEMPLATE = (month, year, fy) => `https://webnodejs.chittorgarh.com/cloud/report/data-read/22/1/${month}/${year}/${fy}/0/0/0?search=&v=22-22`;

export const scrapeChittorgarhSubscription = async () => {
    console.log('Starting Chittorgarh subscription fetch (API) - Multi-Month...');

    // Map to prevent duplicates if an IPO appears in multiple months (rare but possible in transitions)
    const combinedDataMap = new Map();

    // Helper: Get Potential FY Strings
    // Returns array of FY strings to try: ["2026-27", "2025-26"]
    const getPotentialFYs = (year) => {
        const next = (year + 1).toString().slice(-2);
        const curr = year.toString().slice(-2);

        // Priority 1: Year-(Year+1) (e.g. 2026-27)
        // Priority 2: (Year-1)-Year (e.g. 2025-26)
        return [
            `${year}-${next}`,
            `${year - 1}-${curr}`
        ];
    };

    const fetchForDate = async (dateObj) => {
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();

        // Dynamic FY probing instead of static calculation
        const fys = getPotentialFYs(year);

        const urls = [];
        for (const fy of fys) {
            urls.push(MAINBOARD_URL_TEMPLATE(month, year, fy));
            urls.push(SME_URL_TEMPLATE(month, year, fy)); // Also try SME for both FYs
        }

        console.log(`Fetching subscription for Month: ${month}/${year}, Probing FYs: ${fys.join(', ')}`);

        // Execute all probes in parallel for this month
        // (4 requests max: 2 types * 2 FY patterns)
        const fetchUrl = async (url) => {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        'Referer': 'https://www.chittorgarh.com/'
                    },
                    timeout: 8000
                });

                if (response.data && response.data.reportTableData) {
                    const records = response.data.reportTableData;
                    if (records.length > 0) {
                        console.log(`  > [SUCCESS] Found ${records.length} records at ${url}`);
                        return records;
                    }
                }
            } catch (err) {
                // Silent fail for probes
                // console.error(`  > Probe failed ${url}:`, err.message);
            }
            return [];
        };

        const promises = urls.map(u => fetchUrl(u));
        const results = await Promise.all(promises);

        // Merge results
        for (const records of results) {
            for (const item of records) {
                const name = item['Company'] || item['Company Name'];
                if (name) {
                    combinedDataMap.set(name, {
                        companyName: name,
                        qib: parseFloat(item['QIB (x)']) || 0,
                        nii: parseFloat(item['NII (x)']) || 0,
                        snii: parseFloat(item['sNII (x)']) || 0,
                        bnii: parseFloat(item['bNII (x)']) || 0,
                        retail: parseFloat(item['Retail (x)']) || 0,
                        employee: parseFloat(item['Employee (x)']) || 0,
                        shareholders: parseFloat(item['Shareholder (x)']) || 0,
                        total: parseFloat(item['Total (x)']) || 0,
                        applications: parseInt((item['Applications'] || '0').replace(/,/g, '')) || 0
                    });
                }
            }
        }
    };

    try {
        const today = new Date();

        // 1. Current Month
        await fetchForDate(new Date(today.getFullYear(), today.getMonth(), 1));

        // 2. Previous Month
        await fetchForDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));

        // 3. Two Months Ago (Just in case)
        await fetchForDate(new Date(today.getFullYear(), today.getMonth() - 2, 1));

        const allSubscriptionData = Array.from(combinedDataMap.values());
        console.log(`Total unique subscription records collected: ${allSubscriptionData.length}`);
        return allSubscriptionData;
    } catch (error) {
        console.error('Fatal error in scrapeChittorgarhSubscription:', error);
        return [];
    }
};
