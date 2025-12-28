import axios from 'axios';
import * as cheerio from 'cheerio';
import slugify from 'slugify';

async function testTarget(name, link) {
    try {
        console.log(`Scraping details for ${name} from ${link}...`);
        const { data: detailHtml } = await axios.get(link);
        const $$ = cheerio.load(detailHtml);

        const getTableValue = (label) => {
            let val = null;
            $$('table tr').each((i, el) => {
                const th = $$(el).find('td:nth-child(1)').text().trim();
                const cleanTh = th.replace(/:$/, '').trim();
                if (cleanTh.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(cleanTh.toLowerCase())) {
                    val = $$(el).find('td:nth-child(2)').text().trim();
                }
            });
            return val;
        };

        const priceRange = getTableValue('IPO Price Band') || getTableValue('Price Band') || "";
        const cleanPriceRange = priceRange.replace(/,/g, '');
        const priceMatch = cleanPriceRange.match(/(\d+(?:\.\d+)?)(?:\s*to\s*[^\d]*(\d+(?:\.\d+)?))?/);
        const minPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
        const maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice;

        console.log("\nResults for", name);
        console.log("Found Price Range String:", priceRange);
        console.log("Parsed Min:", minPrice, "Max:", maxPrice);

        // Test revamped subscription fallback
        console.log("\nTesting revamped subscription fallback for", name);
        let subscription = { qib: 0, nii: 0, retail: 0, total: 0 };
        const ipoSlug = slugify(name, { lower: true, strict: true });

        const linkSlug = link.split('/').filter(Boolean).pop();
        const baseSlug = linkSlug.replace(/-date-review-price-allotment-details$/, '')
            .replace(/-allotment-details$/, '')
            .replace(/-allotment-status$/, '');

        const subUrls = [
            `https://ipowatch.in/${baseSlug}-subscription-status/`,
            `https://ipowatch.in/${ipoSlug}-ipo-subscription-status/`,
            link.replace('-allotment-details/', '-subscription-status/')
        ];

        for (const subUrl of subUrls) {
            try {
                console.log("Trying URL:", subUrl);
                const { data: subHtml } = await axios.get(subUrl);
                const $$$ = cheerio.load(subHtml);

                $$$('table tr').each((i, el) => {
                    const cols = $$$(el).find('td');
                    if (cols.length >= 2) {
                        const category = $$$(cols[0]).text().trim().toUpperCase();
                        const totalVal = parseFloat($$$(cols[cols.length - 1]).text().trim().replace(/,/g, '')) || 0;

                        if (category.includes('QIB')) subscription.qib = totalVal;
                        else if (category.includes('NII')) subscription.nii = totalVal;
                        else if (category.includes('RETAIL') || category.includes('RII')) subscription.retail = totalVal;
                        else if (category.includes('TOTAL')) subscription.total = totalVal;
                    }
                });
                if (subscription.total > 0) {
                    console.log("SUCCESS! Found subscription at", subUrl);
                    console.log("Data:", subscription);
                    break;
                }
            } catch (err) {
                console.log("Failed:", subUrl, "-", err.message);
            }
        }

    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

testTarget('ICICI Prudential AMC', 'https://ipowatch.in/icici-prudential-amc-ipo-date-review-price-allotment-details/');
