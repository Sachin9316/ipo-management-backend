import axios from 'axios';
import * as cheerio from 'cheerio';

const IPOWATCH_GMP_URL = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

async function checkGMP() {
    console.log("Starting GMP Debug (Table-based approach)...");

    try {
        console.log(`\nFetching IPOWatch: ${IPOWATCH_GMP_URL}`);
        const { data } = await axios.get(IPOWATCH_GMP_URL, { headers: HEADERS });
        const $ = cheerio.load(data);
        console.log("IPOWatch Results:");

        $('table').each((tableIdx, table) => {
            console.log(`\n--- Table ${tableIdx} ---`);
            // Find header to determine GMP column
            let gmpIndex = -1;

            // Try to find header in thead or first tr
            const rows = $(table).find('tr');
            if (rows.length === 0) return;

            const headerCols = $(rows[0]).find('td, th'); // IPOWatch uses td for header sometimes?
            headerCols.each((colIdx, col) => {
                const text = $(col).text().toLowerCase();
                if (text.includes('gmp') || text.includes('premium')) {
                    gmpIndex = colIdx;
                    console.log(`Found GMP column at index ${gmpIndex} ("${$(col).text().trim()}")`);
                }
            });

            if (gmpIndex === -1) {
                // Fallback or skip
                console.log("No GMP column found in header. Skipping or using default?");
                // Default for table 1 might be 2?
                return;
            }

            // Iterate data rows
            rows.each((rowIdx, row) => {
                if (rowIdx === 0) return; // Skip header
                const cols = $(row).find('td');
                if (cols.length > gmpIndex) {
                    const name = $(cols[0]).text().trim();
                    const gmp = $(cols[gmpIndex]).text().trim();
                    console.log(`- ${name}: ${gmp}`);
                }
            });
        });

    } catch (e) { console.error("IPOWatch Error:", e.message); }
}

checkGMP();
