import axios from 'axios';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import Mainboard from '../models/mainboard.model.js';
import { isMatch, parseCurrency, parseIssueSize, roundToTwo, getSimilarity } from '../utils/matching.js';
// ... (imports remain the same, just updating line 5)

// ...

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
        const rows = $('figure.wp-block-table table tbody tr').slice(0, limit + 5); // Take a few extra to account for headers
        console.log(`Found ${rows.length} raw rows.`);

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
            const typeStr = row.find('td:nth-child(7)').text().trim(); // "SME" or "Mainboard"

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
                        // Remove trailing colons for better matching
                        const cleanTh = th.replace(/:$/, '').trim();
                        if (cleanTh.toLowerCase().includes(label.toLowerCase()) ||
                            label.toLowerCase().includes(cleanTh.toLowerCase())) {
                            val = $$(el).find('td:nth-child(2)').text().trim();
                        }
                    });
                    return val;
                };

                const getTableLink = (label) => {
                    let link = "";
                    $$('table tr').each((i, el) => {
                        const th = $$(el).find('td:nth-child(1)').text().trim();
                        if (th.toLowerCase().includes(label.toLowerCase())) {
                            link = $$(el).find('td:nth-child(2) a').attr('href') || "";
                        }
                    });
                    return link;
                };

                // Extract Dates
                // Trying specific labels seen in inspection
                const openDate = parseDate(getTableValue('IPO Open Date'));
                const closeDate = parseDate(getTableValue('IPO Close Date'));
                const listingDate = parseDate(getTableValue('IPO Listing Date') || getTableValue('Listing Date'));
                const allotmentDate = parseDate(getTableValue('Basis of Allotment'));
                const refundDate = parseDate(getTableValue('Refunds')); // "Refunds:"

                // Prospectus Links
                const drhpLink = getTableLink('DRHP Draft Prospectus');
                const rhpLink = getTableLink('RHP Draft Prospectus');

                // Financials / Lot
                const issueSizeRaw = getTableValue('Issue Size');
                const issueSize = parseIssueSize(issueSizeRaw);

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

                const priceRange = getTableValue('IPO Price Band') || getTableValue('Price Band') || priceStr; // "₹227 to ₹239 Per Share"
                const cleanPriceRange = priceRange.replace(/,/g, '');
                // Match numbers, handle "to" with optional symbols in between
                const priceMatch = cleanPriceRange.match(/(\d+(?:\.\d+)?)(?:\s*to\s*[^\d]*(\d+(?:\.\d+)?))?/);
                const minPrice = priceMatch ? parseFloat(priceMatch[1]) : parseCurrency(priceStr);
                const maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice;

                // Registrar
                const registrarName = getTableValue('Registrar') || "N/A";

                const finalStatus = calculateStatus(openDate, closeDate, listingDate);

                // Robust SME Detection: If Lot Price > 50,000, it's an SME (Mainboard is ~15k)
                const calculatedLotPrice = (lotShares || 0) * maxPrice;
                const isSMEHeuristic = calculatedLotPrice > 50000;
                const finalIpoType = (typeStr.toUpperCase().includes("SME") || isSMEHeuristic) ? "SME" : "MAINBOARD";

                const ipoData = {
                    companyName: name,
                    slug: slugify(name, { lower: true, strict: true }),
                    icon: "https://cdn-icons-png.flaticon.com/512/25/25231.png", // Placeholder
                    ipoType: finalIpoType,
                    status: finalStatus,
                    gmp: [{
                        price: gmpVal,
                        kostak: "0",
                        date: new Date()
                    }],
                    issueSize: issueSize || "0.00",
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
                    registrarName: registrarName,
                    registrarLink: getTableLink('Registrar'),
                    lot_size: lotShares || 0,
                    lot_price: calculatedLotPrice,
                    min_price: minPrice,
                    max_price: maxPrice,
                    isAllotmentOut: false,
                    drhp_pdf: drhpLink,
                    rhp_pdf: rhpLink,
                    link: link
                };

                ipos.push(ipoData);
                if (ipos.length >= limit) break;

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
import { scrapeChittorgarhIPOs, fetchChittorgarhAPIData } from './chittorgarh-list.service.js';

export const scrapeAndSaveIPOData = async (limit = 3) => {
    try {
        console.log("Step 1a: Scraping basic IPO data from IPOWatch...");
        const ipowatchIpos = await scrapeIPOData(limit);

        console.log("Step 1b: Scraping basic IPO data from Chittorgarh...");
        const chittorgarhIpos = await scrapeChittorgarhIPOs(limit);

        console.log("Step 1c: Fetching data from new Chittorgarh API...");
        const apiDataList = await fetchChittorgarhAPIData();
        console.log(`Fetched ${apiDataList.length} records from API.`);

        // Create Master Map - Seeding with API Data FIRST as Primary Source
        const ipoMap = new Map();

        // 1. Add API Data (Authoritative for Name, Dates, Price, Size)
        apiDataList.forEach(item => {
            // Default Date Calculations
            const closeDate = item.close_date ? new Date(item.close_date) : new Date();
            // Estimate Allotment ~2-3 days after close, Refund ~3-4 days
            const allotmentDate = item.close_date ? new Date(closeDate.getTime() + 3 * 24 * 60 * 60 * 1000) : new Date();
            const refundDate = item.close_date ? new Date(closeDate.getTime() + 4 * 24 * 60 * 60 * 1000) : new Date();

            ipoMap.set(item.slug, {
                ...item,
                // Required Defaults for Schema Validation
                allotment_date: allotmentDate,
                refund_date: refundDate,
                lot_size: 0,
                lot_price: 0,
                registrarName: "N/A",
                registrarLink: "",

                gmp: [],
                subscription: { qib: 0, nii: 0, retail: 0, total: 0 },
                status: calculateStatus(item.open_date, item.close_date, item.listing_date),
                ipoType: "MAINBOARD",
                isAllotmentOut: false
            });
        });

        // 2. Merge IPOWatch Data (Source for GMP, Subscription, IPO Type)
        ipowatchIpos.forEach(scraped => {
            let match = ipoMap.get(scraped.slug);

            // Fuzzy match if exact slug not found
            if (!match) {
                let bestScore = 0;
                let bestSlug = null;
                for (const [slug, apiItem] of ipoMap.entries()) {
                    const score = getSimilarity(scraped.companyName, apiItem.companyName);
                    if (score > bestScore) {
                        bestScore = score;
                        bestSlug = slug;
                    }
                }
                if (bestScore > 0.3 && bestSlug) {
                    match = ipoMap.get(bestSlug);
                }
            }

            if (match) {
                // Merge Scraped Data INTO API Record
                // PRESERVE API Fields (Name, Dates, Price, Size)
                // ONLY update missing or complementary fields

                // GMP - Always take from scraper if available
                if (scraped.gmp && scraped.gmp.length > 0) match.gmp = scraped.gmp;

                // Subscription - Take scraper if API didn't provide (API currently doesn't)
                if (scraped.subscription && scraped.subscription.total > match.subscription?.total) {
                    match.subscription = scraped.subscription;
                }

                // IPO Type - Scraper usually knows best (SME vs Mainboard)
                if (scraped.ipoType) match.ipoType = scraped.ipoType;

                // Status - Re-calculate based on authoritative API dates
                match.status = calculateStatus(match.open_date, match.close_date, match.listing_date);

                // Links
                if (scraped.drhp_pdf) match.drhp_pdf = scraped.drhp_pdf;
                if (scraped.rhp_pdf) match.rhp_pdf = scraped.rhp_pdf;
                if (!match.link && scraped.link) match.link = scraped.link;

                console.log(`Merged Scraper data into API record for: ${match.companyName}`);
            } else {
                // No match found in API list -> Add as new record (Source: IPOWatch only)
                // This captures IPOs that might not be in the API feed yet
                ipoMap.set(scraped.slug, scraped);
            }
        });

        // 3. Merge Chittorgarh Legacy Data (Optional, mostly for extra sub data or failover)
        chittorgarhIpos.forEach(legacy => {
            let match = ipoMap.get(legacy.slug);
            // ... simplify legacy merge or skip if we trust API + IPOWatch enough
            // For now, let's skip deep merging legacy unless it's a new record
            if (!match) {
                // Try fuzzy
                let bestScore = 0;
                let bestSlug = null;
                for (const [slug, existing] of ipoMap.entries()) {
                    const score = getSimilarity(legacy.companyName, existing.companyName);
                    if (score > bestScore) {
                        bestScore = score;
                        bestSlug = slug;
                    }
                }
                if (bestScore > 0.3 && bestSlug) match = ipoMap.get(bestSlug);
            }

            if (!match) {
                ipoMap.set(legacy.slug, legacy);
            }
        });

        const ipos = Array.from(ipoMap.values());

        console.log(`Total IPOs to process: ${ipos.length}`);

        console.log("Step 2: Scraping live subscription data from Chittorgarh...");
        const subscriptionData = await scrapeChittorgarhSubscription();

        console.log("Step 3: Merging data and saving to DB...");
        let savedCount = 0;
        let errors = [];

        for (const ipo of ipos) {
            try {
                // Merge Subscription Data
                const subInfo = subscriptionData.find(s => isMatch(s.companyName, ipo.companyName));
                if (subInfo && subInfo.total > 0) {
                    console.log(`Found subscription data for ${ipo.companyName} from Chittorgarh`);
                    ipo.subscription = {
                        qib: roundToTwo(subInfo.qib),
                        nii: roundToTwo(subInfo.nii),
                        snii: roundToTwo(subInfo.snii),
                        bnii: roundToTwo(subInfo.bnii),
                        retail: roundToTwo(subInfo.retail),
                        employee: roundToTwo(subInfo.employee),
                        total: roundToTwo(subInfo.total)
                    };
                } else {
                    // Fallback: Try to scrape from IPOWatch dedicated subscription page
                    try {
                        console.log(`Looking for fallback subscription for ${ipo.companyName}...`);
                        // Standard pattern for subscription page: [slug]-subscription-status/
                        // Derive base slug from the detail link
                        const linkSlug = ipo.link.split('/').filter(Boolean).pop();
                        const baseSlug = linkSlug.replace(/-date-review-price-allotment-details$/, '')
                            .replace(/-allotment-details$/, '')
                            .replace(/-allotment-status$/, '');

                        const subUrls = [
                            `https://ipowatch.in/${baseSlug}-subscription-status/`,
                            `https://ipowatch.in/${ipo.slug}-ipo-subscription-status/`,
                            ipo.link.replace('-allotment-details/', '-subscription-status/')
                        ];

                        let fetchedSub = false;
                        for (const subUrl of subUrls) {
                            try {
                                const { data: subHtml } = await axios.get(subUrl);
                                const $$$ = cheerio.load(subHtml);

                                $$$('table tr').each((i, el) => {
                                    const cols = $$$(el).find('td');
                                    if (cols.length >= 2) {
                                        const category = $$$(cols[0]).text().trim().toUpperCase();
                                        const totalVal = parseFloat($$$(cols[cols.length - 1]).text().trim().replace(/,/g, '')) || 0;

                                        if (category.includes('QIB')) ipo.subscription.qib = totalVal;
                                        else if (category.includes('NII')) ipo.subscription.nii = totalVal;
                                        else if (category.includes('RETAIL') || category.includes('RII')) ipo.subscription.retail = totalVal;
                                        else if (category.includes('TOTAL')) ipo.subscription.total = totalVal;
                                    }
                                });
                                if (ipo.subscription.total > 0) {
                                    console.log(`Found fallback subscription for ${ipo.companyName} from ${subUrl}`);
                                    fetchedSub = true;
                                    break;
                                }
                            } catch (e) {
                                // Continue to next pattern
                            }
                        }
                    } catch (subErr) {
                        // console.log(`No fallback subscription page for ${ipo.companyName}`);
                    }
                }

                // Upsert: Update if exists, Insert if new
                let existingIPO = await Mainboard.findOne({ slug: ipo.slug });

                // FUZZY MATCH CHECK: If not found by exact slug, check for similar names to prevent duplicates
                if (!existingIPO) {
                    const allIPOs = await Mainboard.find({}, 'companyName slug').lean();
                    let bestMatch = null;
                    let highestScore = 0;

                    for (const existing of allIPOs) {
                        const score = getSimilarity(existing.companyName, ipo.companyName);
                        if (score > highestScore) {
                            highestScore = score;
                            bestMatch = existing;
                        }
                    }

                    if (bestMatch && highestScore > 0.3) {
                        console.log(`Fuzzy duplicate found! "${ipo.companyName}" matches "${bestMatch.companyName}" (Score: ${highestScore.toFixed(2)})`);
                        // Use the EXISTING slug so we update the old record instead of creating a new one
                        ipo.slug = bestMatch.slug;
                        existingIPO = await Mainboard.findOne({ slug: ipo.slug });
                    }
                }

                // Enhanced Logic for Allotment Status
                if (ipo.status === 'UPCOMING' || ipo.status === 'OPEN') {
                    ipo.isAllotmentOut = false;
                } else {
                    // 1. If date passed, set to true
                    if (new Date(ipo.allotment_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)) {
                        ipo.isAllotmentOut = true;
                    }
                    // 2. If already true in DB, keep it true (don't overwrite with false)
                    if (existingIPO && existingIPO.isAllotmentOut) {
                        ipo.isAllotmentOut = true;
                    }
                }

                if (existingIPO) {
                    // Update only if gmp changed and it is an SME IPO
                    // Mainboard IPOs have manual GMP entry now
                    if (ipo.ipoType === 'SME') {
                        const latestGmp = existingIPO.gmp && existingIPO.gmp.length > 0 ? existingIPO.gmp[existingIPO.gmp.length - 1] : null;
                        const newGmpPrice = ipo.gmp[0].price;

                        if (!latestGmp || latestGmp.price !== newGmpPrice) {
                            existingIPO.gmp.push(ipo.gmp[0]);
                            if (existingIPO.gmp.length > 30) existingIPO.gmp.shift();
                        }
                    }

                    // Update other fields but preserve gmp array
                    // USER REQUEST (UPDATED): Allow overwriting companyName with new API data
                    // We still keep registrarName protected if it's "N/A" (default) to avoid overwriting good data with bad
                    const { gmp, registrarName, registrarLink, icon, ...otherData } = ipo;

                    // Only exclude registrar if our new data is invalid/default
                    if (ipo.registrarName !== "N/A") {
                        // actually, we put it in otherData if we want to update it. 
                        // But currently api provides "N/A". So we simply DON'T include it in the $set if we exclude it here.
                        // Wait, if I exclude `registrarName` from `otherData`, it won't verify.
                    }

                    // Simple approach: Use ...otherData. 
                    // Since ipo.registrarName is "N/A" (from api defaults), we should NOT let it overwrite existing valid registrar.
                    // So we KEEP excluding registrarName from the spread, and handled logic manually or just leave it.
                    // But companyName IS removed from exclusion list below.

                    await Mainboard.updateOne(
                        { slug: ipo.slug },
                        { $set: { ...otherData, gmp: existingIPO.gmp } }
                    );
                } else {
                    // Start new Mainboard IPOs with empty GMP for manual entry
                    if (ipo.ipoType !== 'SME') {
                        ipo.gmp = [];
                    }
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
