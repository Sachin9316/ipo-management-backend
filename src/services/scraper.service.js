import axios from 'axios';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import Mainboard from '../models/mainboard.model.js';
import { isMatch, parseCurrency } from '../utils/matching.js';

const BASE_URL = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';

// Helper: Parse Date (e.g., "26-Dec" or "December 26, 2025" -> Date object)
const parseDate = (str) => {
    if (!str || str.toLowerCase().includes('na')) return null;
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
};

// Helper: Calculate status based on dates
const calculateStatus = (open, close, listing) => {
    const now = new Date();
    if (!open) return "UPCOMING";
    if (now < open) return "UPCOMING";
    if (now >= open && now <= close) return "OPEN";
    if (now > close && (!listing || now < listing)) return "CLOSED";
    if (listing && now >= listing) return "LISTED";
    return "CLOSED";
};

export const scrapeIPOData = async (limit = 3) => {
    try {
        console.log(`Fetching GMP list from ${BASE_URL}...`);
        const { data: listHtml } = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(listHtml);

        const ipos = [];
        // The main GMP table is usually the first table in a figure
        const rows = $('figure.wp-block-table table tbody tr').slice(0, limit);
        console.log(`Found ${rows.length} rows in the main table.`);

        for (const element of rows) {
            const row = $(element);

            // Expected Columns: Stock/IPO | IPO GMP | IPO Price | Listing Gain | Date | Type
            // Check headers if possible, but assuming standard order based on verification
            const anchor = row.find('td:nth-child(1) a');
            const name = anchor.text().trim();
            const link = anchor.attr('href');

            const gmpStr = row.find('td:nth-child(2)').text().trim(); // "₹5" or "₹-"
            const priceStr = row.find('td:nth-child(3)').text().trim(); // "₹239" or "₹227 to ₹239"
            // const dateStr = row.find('td:nth-child(5)').text().trim(); // "23-26 Dec"
            const typeStr = row.find('td:nth-child(6)').text().trim(); // "SME" or "Mainboard"

            if (!name || !link) continue;

            const gmpVal = parseCurrency(gmpStr);
            console.log(`Scraping details for ${name} from ${link}...`);

            // Fetch Detail Page
            try {
                const { data: detailHtml } = await axios.get(link);
                const $$ = cheerio.load(detailHtml);

                // Helper to find value in tables based on Label column
                const getTableValue = (label) => {
                    let val = null;
                    $$('table tr').each((i, el) => {
                        const th = $$(el).find('td:nth-child(1)').text().trim(); // Labels are often in first td
                        if (th.toLowerCase().includes(label.toLowerCase())) {
                            val = $$(el).find('td:nth-child(2)').text().trim();
                        }
                    });
                    return val;
                };

                // Extract Dates
                // Trying specific labels seen in inspection
                const openDate = parseDate(getTableValue('IPO Open Date'));
                const closeDate = parseDate(getTableValue('IPO Close Date'));
                const listingDate = parseDate(getTableValue('IPO Listing Date') || getTableValue('Listing Date'));
                const allotmentDate = parseDate(getTableValue('Basis of Allotment'));
                const refundDate = parseDate(getTableValue('Refunds')); // "Refunds:"

                // Financials / Lot
                const issueSize = getTableValue('Issue Size'); // "Approx ₹42.60 Crores"

                // For Lot Size, we need to find the "Market Lot" or "Lot Size" table specifically
                // We'll search for the row starting with "Retail Minimum" and take the 3rd column (Shares)
                let lotShares = 0;
                $$('table tr').each((i, el) => {
                    const firstCol = $$(el).find('td:nth-child(1)').text().trim();
                    if (firstCol && firstCol.toLowerCase().includes('retail minimum')) {
                        const sharesCol = $$(el).find('td:nth-child(3)').text().trim(); // 3rd column is usually Shares
                        lotShares = parseInt(sharesCol.replace(/,/g, '')) || 0;
                    }
                });

                const priceRange = getTableValue('IPO Price Band') || priceStr; // "₹227 to ₹239 Per Share"
                const priceMatch = priceRange.match(/(\d+)(?:\s*to\s*(\d+))?/);
                const minPrice = priceMatch ? parseFloat(priceMatch[1]) : parseCurrency(priceStr);
                const maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice;

                // Registrar
                const registrarName = getTableValue('Registrar') || "N/A";

                const finalStatus = calculateStatus(openDate, closeDate, listingDate);

                const ipoData = {
                    companyName: name,
                    slug: slugify(name, { lower: true, strict: true }),
                    icon: "https://cdn-icons-png.flaticon.com/512/25/25231.png", // Placeholder
                    ipoType: typeStr.toUpperCase().includes("SME") ? "SME" : "MAINBOARD",
                    status: finalStatus,
                    gmp: [{
                        price: gmpVal,
                        kostak: "0",
                        date: new Date()
                    }],
                    issueSize: issueSize || "N/A",
                    subscription: {
                        qib: 0,
                        nii: 0,
                        retail: 0,
                        total: 0
                    },
                    open_date: openDate || new Date(),
                    close_date: closeDate || new Date(),
                    listing_date: listingDate || new Date(),
                    refund_date: refundDate || new Date(),
                    allotment_date: allotmentDate || new Date(),
                    registrarName: registrarName,
                    registrarLink: "",
                    lot_size: lotShares || 0,
                    lot_price: (lotShares || 0) * maxPrice,
                    min_price: minPrice,
                    max_price: maxPrice,
                    bse_code_nse_code: "Link",
                    isAllotmentOut: false,
                    drhp_pdf: "",
                    rhp_pdf: ""
                };

                ipos.push(ipoData);

            } catch (detailError) {
                console.error(`Error scraping details for ${name}:`, detailError.message);
                continue;
            }
        }

        return ipos;
    } catch (error) {
        console.error("Scraping Error:", error);
        throw new Error("Failed to scrape IPO data");
    }
};

import { scrapeChittorgarhSubscription } from './chittorgarh.service.js';

export const scrapeAndSaveIPOData = async (limit = 3) => {
    try {
        console.log("Step 1: Scraping basic IPO data from IPOWatch...");
        const ipos = await scrapeIPOData(limit);

        console.log("Step 2: Scraping live subscription data from Chittorgarh...");
        const subscriptionData = await scrapeChittorgarhSubscription();

        console.log("Step 3: Merging data and saving to DB...");
        let savedCount = 0;
        let errors = [];

        for (const ipo of ipos) {
            try {
                // Merge Subscription Data
                const subInfo = subscriptionData.find(s => isMatch(s.companyName, ipo.companyName));
                if (subInfo) {
                    console.log(`Found subscription data for ${ipo.companyName}`);
                    ipo.subscription = {
                        qib: subInfo.qib || 0,
                        nii: subInfo.nii || 0,
                        retail: subInfo.retail || 0,
                        total: subInfo.total || 0
                    };
                }

                // Enhanced Logic for Allotment Status
                // If we have an allotment date in the past, or specific flags (to be added)
                // For now, simple date check is a good fallback if "Allotment Out" text isn't explicitly found
                if (new Date(ipo.allotment_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)) {
                    // Check if not explicitly set to false by scraper
                    if (ipo.isAllotmentOut === undefined) ipo.isAllotmentOut = true;
                }

                // Upsert: Update if exists, Insert if new
                const existingIPO = await Mainboard.findOne({ slug: ipo.slug });
                if (existingIPO) {
                    // Update only if gmp changed
                    const latestGmp = existingIPO.gmp && existingIPO.gmp.length > 0 ? existingIPO.gmp[existingIPO.gmp.length - 1] : null;
                    const newGmpPrice = ipo.gmp[0].price;

                    if (!latestGmp || latestGmp.price !== newGmpPrice) {
                        existingIPO.gmp.push(ipo.gmp[0]);
                        if (existingIPO.gmp.length > 30) existingIPO.gmp.shift();
                    }

                    // Update other fields but preserve gmp array
                    const { gmp, ...otherData } = ipo;
                    await Mainboard.updateOne(
                        { slug: ipo.slug },
                        { $set: { ...otherData, gmp: existingIPO.gmp } }
                    );
                } else {
                    await Mainboard.create(ipo);
                }
                savedCount++;
            } catch (err) {
                console.error(`Failed to save IPO ${ipo.companyName}:`, err.message);
                errors.push({ name: ipo.companyName, error: err.message });
            }
        }

        return { success: true, count: savedCount, total: ipos.length, errors };
    } catch (error) {
        throw new Error(`Sync failed: ${error.message}`);
    }
};
