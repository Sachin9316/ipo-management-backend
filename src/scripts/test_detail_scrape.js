import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const scrapeDetail = async () => {
    // Dynamic URL Construction
    const slug = "modern-diagnostic-ipo";
    const id = "2276";
    const url = `https://www.chittorgarh.com/ipo/${slug}/${id}/`;

    console.log(`Scraping URL: ${url}`);

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const dataMap = new Map();
        const linksMap = new Map();

        // 1. Universal Table Scraper: Flatten all key-value pairs from all tables
        $('table').each((i, table) => {
            $(table).find('tr').each((j, row) => {
                const cells = $(row).find('td, th'); // Include TH
                if (cells.length >= 2) {
                    let key = $(cells[0]).text().trim().replace(/[:?]/g, ''); // Remove : and ?
                    let value = $(cells[1]).text().trim();

                    // Normalization for lookup
                    const normalizedKey = key.toLowerCase().replace(/\s+/g, ' ');

                    if (normalizedKey && value) {
                        dataMap.set(normalizedKey, value);

                        // Capture links if present (e.g., Registrar link, RHP)
                        const link = $(cells[1]).find('a').attr('href');
                        if (link) {
                            linksMap.set(normalizedKey, link);
                        }
                    }
                }
            });
        });



        console.log("All Keys found:", [...dataMap.keys()]);
        fs.writeFileSync('parsed_keys.txt', JSON.stringify([...dataMap.keys()], null, 2));

        // 2. Extraction Helpers
        const getVal = (keys) => {
            for (const k of keys) {
                if (dataMap.has(k)) return dataMap.get(k);
            }
            return null;
        };

        const parseAmount = (str) => {
            if (!str) return 0;
            return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
        };

        // 3. Construct Result Object

        // Date parsing helper
        const extractDates = (str) => {
            if (!str) return { open: null, close: null };
            const parts = str.split(' to ');
            return {
                open: parts[0] ? parts[0].trim() : null,
                close: parts[1] ? parts[1].trim() : null
            };
        };

        const ipoDates = extractDates(getVal(['ipo date'])); // "Dec 31, 2025 to Jan 02, 2026"

        const priceRange = getVal(['price band', 'issue price']);
        const lotSizeStr = getVal(['lot size', 'minimum order quantity']);
        const lotSize = lotSizeStr ? parseInt(lotSizeStr.replace(/[^0-9]/g, '')) : 0;

        let minPrice = 0;
        let maxPrice = 0;

        if (priceRange) {
            const prices = priceRange.match(/(\d+[\d,]*(\.\d+)?)/g);
            if (prices) {
                const numericPrices = prices.map(p => parseFloat(p.replace(/,/g, '')));
                minPrice = Math.min(...numericPrices);
                maxPrice = Math.max(...numericPrices);
            }
        }

        // Registrar Search (Text based if table fails)
        let registrarName = getVal(['registrar']);
        let registrarLink = linksMap.get('registrar');

        if (!registrarName) {
            // Find h2 or strong containing "Registrar"
            $('h2, strong, b').each((i, el) => {
                if ($(el).text().includes("Registrar")) {
                    // Start looking at siblings/parents
                    const parent = $(el).parent(); // usually a div or li
                    // The link is usually inside this block
                    const link = parent.find('a').first();
                    if (link.length > 0) {
                        registrarName = link.text().trim();
                        registrarLink = link.attr('href');
                    } else {
                        // Text node
                        registrarName = parent.text().replace("Registrar", "").trim();
                    }
                }
            });
        }

        // Timetable Search (Specific Table)
        let allotmentDate = null;
        let refundDate = null;
        let creditDate = null;

        $('table').each((i, table) => {
            const html = $(table).html();
            if (html.includes("Basis of Allotment")) {
                $(table).find('tr').each((j, row) => {
                    const cols = $(row).find('td');
                    if (cols.length >= 2) {
                        const event = $(cols[0]).text().trim();
                        const date = $(cols[1]).text().trim();
                        if (event.includes("Basis of Allotment")) allotmentDate = date;
                        if (event.includes("Initiation of Refunds")) refundDate = date;
                        if (event.includes("Credit of Shares")) creditDate = date;
                    }
                });
            }
        });

        const result = {
            companyName: $('h1').text().trim(),
            issueType: getVal(['issue type']),
            faceValue: getVal(['face value']),
            priceRange: getVal(['price band', 'issue price']),
            minPrice,
            maxPrice,
            lotSize: lotSize,
            lotPrice: maxPrice * lotSize,
            issueSize: getVal(['total issue size', 'issue size']),
            listingAt: getVal(['listing at', 'listed on']),
            shareHoldingPre: getVal(['share holding pre issue']),
            shareHoldingPost: getVal(['share holding post issue']),
            registrarName: registrarName,
            registrarLink: registrarLink,

            // Dates
            openDate: ipoDates.open,
            closeDate: ipoDates.close,
            listingDate: getVal(['listed on', 'listing date']),
            allotmentDate: allotmentDate,
            refundDate: refundDate,
            creditDate: creditDate,

            // Documents
            rhpLink: linksMap.get('rhp') || linksMap.get('red herring prospectus'),
            drhpLink: linksMap.get('drhp') || linksMap.get('draft red herring prospectus'),
        };
        console.log("\n--- Robust JSON Result ---");
        console.log(JSON.stringify(result, null, 2));

        fs.writeFileSync('detail_scrape_output.json', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Error scraping:", error.message);
    }
};

scrapeDetail();
