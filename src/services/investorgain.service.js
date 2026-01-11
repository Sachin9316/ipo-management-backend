import axios from 'axios';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { parseCurrency, parseIssueSize } from '../utils/matching.js';

const API_BASE_URL = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/1";

export const fetchInvestorGainGMP = async () => {
    try {
        const currentYear = new Date().getFullYear();

        // Financial Year Logic
        // If Jan-Mar, FY is (Year-1)-(Year). E.g. Jan 2026 -> 2025-26
        // If Apr-Dec, FY is (Year)-(Year+1). E.g. Dec 2025 -> 2025-26
        let fyStart = currentYear;
        if (new Date().getMonth() < 3) {
            fyStart = currentYear - 1;
        }
        const fy = `${fyStart}-${(fyStart + 1).toString().slice(-2)}`;

        const fetchYearData = async (year) => {
            let start = 0;
            let allItems = [];

            while (true) {
                const url = `${API_BASE_URL}/${year}/${fy}/${start}/all?search=&v=${Date.now()}`;
                // console.log(`Fetching: ${url}`); // Too noisy for prod
                try {
                    const { data } = await axios.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Referer': 'https://www.investorgain.com/',
                            'Origin': 'https://www.investorgain.com'
                        }
                    });

                    const items = data?.reportTableData || [];
                    if (items.length === 0) break;

                    allItems = [...allItems, ...items];
                    start += items.length;

                    // Safety break & optimization
                    if (items.length < 10) break; // Assuming page size is at least 10, if we got less, it's the end.
                    if (start > 1000) break; // Hard limit

                } catch (error) {
                    console.error(`Error fetching year ${year} offset ${start}:`, error.message);
                    break;
                }
            }
            console.log(`Fetched ${allItems.length} records for year ${year}`);
            return allItems;
        };

        console.log(`Fetching InvestorGain data for ${currentYear} and ${currentYear - 1}...`);

        const [dataCurrent, dataPrev] = await Promise.all([
            fetchYearData(currentYear),
            fetchYearData(currentYear - 1)
        ]);

        let rawData = [...dataCurrent, ...dataPrev];

        if (rawData.length === 0) {
            console.error("Invalid response format or empty data from InvestorGain");
            return [];
        }

        // Deduplicate
        const uniqueMap = new Map();
        rawData.forEach(item => {
            // Use name as key, prefer newer (though order matters, 2026 first)
            // Check if ~gmp_updated exist?
            // Simple unique by name
            if (!uniqueMap.has(item['~ipo_name'])) {
                uniqueMap.set(item['~ipo_name'], item);
            }
        });

        const ipos = Array.from(uniqueMap.values()).map(item => {
            // ~ipo_name: "Armour Security NSE SME"
            const rawName = item['~ipo_name'] || "";
            // Clean up name (remove NSE, BSE, SME suffixes often found in these raw names for cleaner display)
            // But we need to match with existing DB, so maybe keep it raw or standard clean.
            // Let's use the provided name but maybe strip "NSE SME" if it's generic.
            // Actually, keep it simple first.
            const name = rawName.replace(/\s+(NSE|BSE)\s+SME\s*$/i, "").replace(/\s+(NSE|BSE)\s*$/i, "").trim();

            // ~IPO_Category: "SME" or "Mainboard" (verify Mainboard key)
            const typeStr = item['~IPO_Category'] || "Mainboard";
            const ipoType = typeStr.toUpperCase().includes("SME") ? "SME" : "MAINBOARD";

            // ~gmp_percent_calc: "1.75"
            const gmpPercentage = parseFloat(item['~gmp_percent_calc']) || 0;

            // GMP: "&#8377;<b>1</b>..."
            // We can extract from html or use percentage * price? 
            // Better to parse the text "1" from "<b>1</b>".
            const gmpHtml = item['GMP'] || "";
            const $gmp = cheerio.load(gmpHtml);
            const gmpText = $gmp('b').text().trim();
            const gmpPrice = parseCurrency(gmpText);

            // Price (₹): "57"
            const priceStr = item['Price (₹)'] || "0";
            const price = parseCurrency(priceStr);

            // Dates
            // ~Srt_Open: "2026-01-14"
            const openDate = item['~Srt_Open'] ? new Date(item['~Srt_Open']) : null;
            const closeDate = item['~Srt_Close'] ? new Date(item['~Srt_Close']) : null;
            const listingDate = item['~Str_Listing'] ? new Date(item['~Str_Listing']) : null; // Note: ~Str_Listing or ~Srt_Listing? Screenshot says ~Str_Listing

            // Lot: "2000"
            const lotSize = parseInt(item['Lot']) || 0;

            return {
                companyName: name,
                slug: slugify(name, { lower: true, strict: true }),
                originalName: rawName,
                ipoType,
                price: gmpPrice,
                gmp_percentage: gmpPercentage,
                minPrice: price, // Assuming fixed price or max price if range
                maxPrice: price,
                lotSize,
                openDate,
                closeDate,
                listingDate,
                source: 'investorgain'
            };
        });

        return ipos;

    } catch (error) {
        console.error("Error fetching InvestorGain GMP:", error.message);
        return [];
    }
};
