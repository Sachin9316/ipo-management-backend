import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseCurrency } from './src/utils/matching.js';

async function testICICI() {
    const link = 'https://ipowatch.in/icici-prudential-amc-ipo-date-review-price-allotment-details/';
    try {
        console.log("Fetching ICICI Prudential AMC details...");
        const { data: detailHtml } = await axios.get(link);
        const $$ = cheerio.load(detailHtml);

        const getTableValue = (label) => {
            let val = null;
            $$('table tr').each((i, el) => {
                const th = $$(el).find('td:nth-child(1)').text().trim();
                // console.log(`Checking label: "${th}" against "${label}"`);
                if (th.toLowerCase().includes(label.toLowerCase())) {
                    val = $$(el).find('td:nth-child(2)').text().trim();
                }
            });
            return val;
        };

        const priceBand = getTableValue('Price Band');
        console.log("Extracted Price Band:", priceBand);

        const priceRange = getTableValue('IPO Price Band') || priceBand || "";
        console.log("Final Price Range String:", priceRange);

        const priceMatch = priceRange.match(/(\d+(?:,\d+)*)(?:\s*to\s*(\d+(?:,\d+)*))?/);
        console.log("Price Match Regex Result:", priceMatch);

        if (priceMatch) {
            const minPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            const maxPrice = priceMatch[2] ? parseFloat(priceMatch[2].replace(/,/g, '')) : minPrice;
            console.log("Parsed Min Price:", minPrice);
            console.log("Parsed Max Price:", maxPrice);
        } else {
            console.log("Regex failed to parse prices.");
        }

        // Check subscription logic (fallback to IPOWatch if Chittorgarh fails)
        const subLink = link.replace('-allotment-details/', '-subscription-status/');
        console.log("\nChecking subscription status page:", subLink);
        try {
            const { data: subHtml } = await axios.get(subLink);
            const $$$ = cheerio.load(subHtml);

            let subscription = { qib: 0, nii: 0, retail: 0, total: 0 };

            $$$('table tr').each((i, el) => {
                const cols = $$$(el).find('td');
                if (cols.length >= 2) {
                    const category = $$$(cols[0]).text().trim().toUpperCase();
                    const totalVal = parseFloat($$$(cols[cols.length - 1]).text().trim()) || 0;

                    if (category.includes('QIB')) subscription.qib = totalVal;
                    else if (category.includes('NII')) subscription.nii = totalVal;
                    else if (category.includes('RETAIL') || category.includes('RII')) subscription.retail = totalVal;
                    else if (category.includes('TOTAL')) subscription.total = totalVal;
                }
            });

            console.log("Extracted Subscription from dedicated page:", subscription);
        } catch (subErr) {
            console.log("Could not fetch dedicated subscription page:", subErr.message);
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testICICI();
