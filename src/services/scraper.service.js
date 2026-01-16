import axios from 'axios';
import { syncMainboardGMP } from './gmp-scraper.service.js';
import { fetchInvestorGainGMP } from './investorgain.service.js';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import Mainboard from '../models/mainboard.model.js';
import Registrar from '../models/Registrar.js';
import { matchRegistrar } from '../utils/registrar-matcher.js';
import { isMatch, parseCurrency, parseIssueSize, roundToTwo, getSimilarity, isSubsetMatch } from '../utils/matching.js';

// ...

const BASE_URL = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';
const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/25/25231.png";


// Helper: Parse Date (e.g., "26-Dec" or "December 26, 2025" -> Date object)
const parseDate = (str) => {
    if (!str || str.toLowerCase().includes('na')) return null;
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
};

// Helper: Calculate status based on dates
// Helper: Calculate status based on dates with strict 5 PM IST cutoff
const calculateStatus = (open, close, listing) => {
    // 1. Get Current IST Time as a "Wall Clock" Date object
    // This ensures that valid IST time components are used regardless of server timezone
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    // 2. Normalize Input Dates to start of day
    const openDate = open ? new Date(open) : null;
    const closeDate = close ? new Date(close) : null;
    const listingDate = listing ? new Date(listing) : null;

    if (openDate) openDate.setHours(0, 0, 0, 0);
    if (closeDate) closeDate.setHours(0, 0, 0, 0);
    if (listingDate) listingDate.setHours(0, 0, 0, 0);

    // 3. Logic
    // If we have listing date and we passed it -> LISTED
    if (listingDate && nowIST >= listingDate) return "LISTED";

    // OPEN CHECK
    // Must be on or after Open Date
    // AND
    // Before Close Date OR (On Close Date AND Before 5 PM)
    if (openDate && nowIST >= openDate) {
        if (!closeDate) return "OPEN"; // No close date implies open indefinitely or data missing, default to OPEN if started

        // Check Closing Logic
        // Normalize nowIST to remove time for date comparison
        const todayIST = new Date(nowIST);
        todayIST.setHours(0, 0, 0, 0);

        if (todayIST < closeDate) {
            // Before the closing day
            return "OPEN";
        } else if (todayIST.getTime() === closeDate.getTime()) {
            // It IS the closing day
            // Check time: 17:00 IST cutoff
            if (nowIST.getHours() < 17) {
                return "OPEN";
            } else {
                return "CLOSED";
            }
        } else {
            // After closing day
            return "CLOSED";
        }
    }

    // If not yet open
    if (openDate && nowIST < openDate) return "UPCOMING";

    // Fallback if no dates
    return "CLOSED";
};

export const scrapeIPOData = async (limit = 3) => {
    try {
        // Fetch High-Quality Data from InvestorGain
        const investorGainData = await fetchInvestorGainGMP();
        const investorGainMap = new Map(investorGainData.map(item => [item.slug, item]));

        console.log(`Fetching GMP list from ${BASE_URL}...`);
        const { data: listHtml } = await axios.get(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(listHtml);

        // The main GMP table is usually the first table in a figure
        // [OPTIMIZATION] Take only strict limit + 2 buffer to avoid over-fetching in parallel
        const rows = $('figure.wp-block-table table tbody tr').slice(0, limit + 2).toArray();
        console.log(`Found ${rows.length} rows to process.`);

        const scrapePromises = rows.map(async (element) => {
            const row = $(element);

            // Expected Columns: Stock/IPO | IPO GMP | IPO Price | Listing Gain | Date | Type
            const anchor = row.find('td:nth-child(1) a');
            const name = anchor.text().trim();
            const link = anchor.attr('href');

            const gmpStr = row.find('td:nth-child(2)').text().trim(); // "₹5" or "₹-"
            const priceStr = row.find('td:nth-child(3)').text().trim(); // "₹239" or "₹227 to ₹239"
            const typeStr = row.find('td:nth-child(7)').text().trim(); // "SME" or "Mainboard"

            if (!name || !link) return null;

            let gmpVal = parseCurrency(gmpStr);
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
                let openDate = parseDate(getTableValue('IPO Open Date'));
                let closeDate = parseDate(getTableValue('IPO Close Date'));
                let listingDate = parseDate(getTableValue('IPO Listing Date') || getTableValue('Listing Date'));
                let allotmentDate = parseDate(getTableValue('Basis of Allotment'));
                let refundDate = parseDate(getTableValue('Refunds')); // "Refunds:"

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
                let minPrice = priceMatch ? parseFloat(priceMatch[1]) : parseCurrency(priceStr);
                let maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice;

                // Registrar
                const registrarName = getTableValue('Registrar') || "N/A";

                // Robust SME Detection: If Lot Price > 50,000, it's an SME (Mainboard is ~15k)
                const calculatedLotPrice = (lotShares || 0) * maxPrice;
                const isSMEHeuristic = calculatedLotPrice > 50000;
                let finalIpoType = (typeStr.toUpperCase().includes("SME") || isSMEHeuristic) ? "SME" : "MAINBOARD";

                // [USER REQUEST] SME IPOs require minimum 2 lots
                if (finalIpoType === 'SME') {
                    lotShares = lotShares * 2;
                }

                const finalLotPrice = (lotShares || 0) * maxPrice;

                const slug = slugify(name, { lower: true, strict: true });

                // --- INTEGRATION: InvestorGain Data ---
                let igMatch = null;
                // 1. Try exact slug match
                if (investorGainMap.has(slug)) {
                    igMatch = investorGainMap.get(slug);
                } else {
                    // 2. Try fuzzy match
                    let bestScore = 0;
                    for (const item of investorGainData) {
                        const score = getSimilarity(name, item.companyName);
                        if (score > 0.8 && score > bestScore) { // High threshold for safety
                            bestScore = score;
                            igMatch = item;
                        }
                    }
                }

                if (igMatch) {
                    console.log(`✅ Matched with InvestorGain: ${name} -> ${igMatch.companyName} (GMP: ₹${igMatch.price})`);
                    // Override critical data with high-quality API data
                    // Only override if valid data exists in IG match
                    if (typeof igMatch.price === 'number') gmpVal = igMatch.price;
                    if (igMatch.openDate) openDate = igMatch.openDate;
                    if (igMatch.closeDate) closeDate = igMatch.closeDate;
                    if (igMatch.listingDate) listingDate = igMatch.listingDate;
                    if (igMatch.ipoType) finalIpoType = igMatch.ipoType;
                    // Percentage is available in igMatch.gmp_percentage if needed
                }
                // --------------------------------------

                const finalStatus = calculateStatus(openDate, closeDate, listingDate);

                return {
                    companyName: name,
                    slug: slugify(name, { lower: true, strict: true }),
                    icon: DEFAULT_ICON, // Placeholder
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
                    registrarLink: getTableLink('Registrar'),
                    lot_size: lotShares || 0,
                    lot_price: finalLotPrice,
                    min_price: minPrice,
                    max_price: maxPrice,
                    isAllotmentOut: false,
                    drhp_pdf: drhpLink,
                    rhp_pdf: rhpLink,
                    link: link
                };

            } catch (detailError) {
                console.error(`Error scraping details for ${name}:`, detailError.message);
                return null;
            }
        });

        // Executing parallel requests
        console.log(`Allocating workers for ${scrapePromises.length} items...`);
        const results = await Promise.all(scrapePromises);

        // Filter out failures and nulls
        const validIPOs = results.filter(item => item !== null);

        // Respect the original strict limit for output
        const finalIPOs = validIPOs.slice(0, limit);
        console.log(`Successfully scraped ${finalIPOs.length} IPOs.`);

        return finalIPOs;
    } catch (error) {
        console.error("Scraping Error:", error);
        throw new Error("Failed to scrape IPO data");
    }
};

import { scrapeChittorgarhSubscription } from './chittorgarh.service.js';
import { scrapeChittorgarhIPOs, fetchChittorgarhAPIData, stripHtml } from './chittorgarh-list.service.js';


// Helper: Cleanup old IPOs
// Helper: Archive old IPOs (Soft Delete)
export const archiveOldIPOs = async () => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

        const result = await Mainboard.updateMany(
            {
                listing_date: { $lt: cutoffDate },
                isArchived: { $ne: true }
            },
            { $set: { isArchived: true } }
        );

        console.log(`Cleanup: Archived ${result.modifiedCount} old IPOs (listed before ${cutoffDate.toISOString().split('T')[0]}).`);
        return result.modifiedCount;
    } catch (error) {
        console.error('Error archiving old IPOs:', error);
        return 0;
    }
};

// Shared Sync Logic to avoid Code Duplication
const syncIPOData = async (limit, type) => {
    try {
        console.log(`Starting ${type} Sync...`);

        // 0. Cleanup old data first (Global cleanup is fine)
        // 0. Archive old data first
        await archiveOldIPOs();

        let ipowatchIpos = [];
        if (type !== 'SME') {
            console.log(`Step 1a: Scraping basic IPO data from IPOWatch (${type})...`);
            // Note: IPOWatch scraping is harder to filter strictly by type at the list level without scraping everything first
            // But we can filter AFTER scraping
            const ipowatchIposAll = await scrapeIPOData(limit * 2); // Fetch more to ensure we get enough of the specific type
            ipowatchIpos = type === 'ALL'
                ? ipowatchIposAll
                : ipowatchIposAll.filter(ipo => ipo.ipoType === type);
        } else {
            console.log(`Step 1a: Skipping IPOWatch for SME sync as requested (Time consuming).`);
        }

        console.log(`Step 1b: Scraping basic IPO data from Chittorgarh (${type})...`);
        const chittorgarhIpos = await scrapeChittorgarhIPOs(limit, type);

        console.log(`Step 1c: Fetching data from new Chittorgarh API (${type})...`);
        const apiDataList = await fetchChittorgarhAPIData(type);
        console.log(`Fetched ${apiDataList.length} records from API.`);

        // Filter out old IPOs from API source
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const validApiData = apiDataList.filter(item => {
            const close = item.close_date ? new Date(item.close_date) : null;
            if (!close) return true;
            return close >= cutoffDate;
        });
        console.log(`Filtered down to ${validApiData.length} active records.`);

        // Fetch Registrars
        const dbRegistrars = await Registrar.find({});

        // Create Master Map - Seeding with API Data FIRST
        const ipoMap = new Map();

        // 1. Add API Data
        for (const item of validApiData) {
            const closeDate = item.close_date ? new Date(item.close_date) : new Date();
            const allotmentDate = item.close_date ? new Date(closeDate.getTime() + 3 * 24 * 60 * 60 * 1000) : new Date();
            const refundDate = item.close_date ? new Date(closeDate.getTime() + 4 * 24 * 60 * 60 * 1000) : new Date();
            const listingDate = item.listing_date ? new Date(item.listing_date) : new Date(closeDate.getTime() + 6 * 24 * 60 * 60 * 1000);

            // Detection Logic
            const itemType = item.ipoType || (stripHtml(item.listing_at || '').toLowerCase().includes('sme') ? 'SME' : 'MAINBOARD');
            if (type !== 'ALL' && itemType !== type) continue;

            ipoMap.set(item.slug, {
                ...item,
                allotment_date: allotmentDate,
                refund_date: refundDate,
                listing_date: listingDate,
                lot_size: 0,
                lot_price: 0,
                registrarName: "N/A",
                registrarLink: "",
                gmp: [],
                subscription: { qib: 0, nii: 0, retail: 0, total: 0 },
                status: calculateStatus(item.open_date, item.close_date, listingDate),
                ipoType: itemType,
                isAllotmentOut: false
            });
        }

        // 2. Merge IPOWatch Data
        for (const scraped of ipowatchIpos) {
            if (type !== 'ALL' && scraped.ipoType !== type) continue;

            let match = ipoMap.get(scraped.slug);
            if (!match) {
                let bestScore = 0;
                let bestSlug = null;
                for (const [slug, apiItem] of ipoMap.entries()) {
                    let score = getSimilarity(scraped.companyName, apiItem.companyName);
                    // Boost score for subset matches (e.g. "Shadowfax" vs "Shadowfax Technologies")
                    if (isSubsetMatch(scraped.companyName, apiItem.companyName)) {
                        score = Math.max(score, 0.9);
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestSlug = slug;
                    }
                }
                if (bestScore > 0.7 && bestSlug) match = ipoMap.get(bestSlug);
            }

            if (match) {
                if (scraped.gmp && scraped.gmp.length > 0) match.gmp = scraped.gmp;
                if (scraped.subscription && scraped.subscription.total > match.subscription?.total) match.subscription = scraped.subscription;

                // Only update type if the new source says SME (Trust SME detection more)
                // or if it's currently N/A or MAINBOARD but the new one is SME.
                if (scraped.ipoType === 'SME') match.ipoType = 'SME';
                match.status = calculateStatus(match.open_date, match.close_date, match.listing_date);
                if (scraped.drhp_pdf) match.drhp_pdf = scraped.drhp_pdf;
                if (scraped.rhp_pdf) match.rhp_pdf = scraped.rhp_pdf;
                if (!match.link && scraped.link) match.link = scraped.link;
                if (!match.lot_size && scraped.lot_size) {
                    match.lot_size = scraped.lot_size;
                    match.lot_price = scraped.lot_price;
                }
                if (match.registrarName === "N/A" && scraped.registrarName && scraped.registrarName !== "N/A") {
                    match.registrarName = scraped.registrarName;
                }
                // Propagate Icon if match has placeholder but scraped has real logo
                if (match.icon === DEFAULT_ICON && scraped.icon && scraped.icon !== DEFAULT_ICON) {
                    match.icon = scraped.icon;
                }
            } else {
                ipoMap.set(scraped.slug, scraped);
            }
        }

        // 3. Merge Chittorgarh Legacy Data
        for (const legacy of chittorgarhIpos) {
            // legacy.ipoType is already filtered by fetcher but good to check
            if (type !== 'ALL' && legacy.ipoType !== type) continue;

            let match = ipoMap.get(legacy.slug);
            if (!match) {
                let bestScore = 0;
                let bestSlug = null;
                for (const [slug, existing] of ipoMap.entries()) {
                    let score = getSimilarity(legacy.companyName, existing.companyName);
                    if (isSubsetMatch(legacy.companyName, existing.companyName)) {
                        score = Math.max(score, 0.9);
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestSlug = slug;
                    }
                }
                if (bestScore > 0.7 && bestSlug) match = ipoMap.get(bestSlug);
            }

            if (match) {
                if (legacy.lot_size > 0) {
                    match.lot_size = legacy.lot_size;
                    match.lot_price = legacy.lot_price;
                }
                if (legacy.registrarName && legacy.registrarName !== "N/A" && legacy.registrarName.length > 3) {
                    // Match with database registrar
                    const matchedReg = matchRegistrar(legacy.registrarName, dbRegistrars);
                    if (matchedReg) {
                        match.registrarName = matchedReg.name;
                        match.registrarLink = matchedReg.websiteLink;
                    } else {
                        // Auto-add new registrar
                        console.log(`New registrar found: ${legacy.registrarName}. Adding to DB.`);
                        try {
                            const newReg = await Registrar.create({
                                name: legacy.registrarName,
                                websiteLink: legacy.registrarLink || "https://www.google.com/search?q=" + encodeURIComponent(legacy.registrarName),
                                description: "Automatically added by scraper"
                            });
                            // Update local list to avoid duplicates in same sync
                            dbRegistrars.push(newReg);
                            match.registrarName = newReg.name;
                            match.registrarLink = newReg.websiteLink;
                        } catch (regErr) {
                            console.error(`Failed to auto-add registrar: ${legacy.registrarName}`, regErr);
                            match.registrarName = legacy.registrarName;
                            if (legacy.registrarLink) match.registrarLink = legacy.registrarLink;
                        }
                    }
                }
                // Trust legacy scraper's type more due to lot price heuristic
                if (legacy.ipoType === 'SME') match.ipoType = 'SME';
                if (legacy.link && !match.link) match.link = legacy.link;
                // Propagate Icon
                if (match.icon === DEFAULT_ICON && legacy.icon && legacy.icon !== DEFAULT_ICON) {
                    match.icon = legacy.icon;
                }
            } else {
                ipoMap.set(legacy.slug, legacy);
            }
        }

        const ipos = Array.from(ipoMap.values());
        console.log(`Total ${type} IPOs to process: ${ipos.length}`);

        console.log("Step 2: Scraping live subscription data from Chittorgarh...");
        const subscriptionData = await scrapeChittorgarhSubscription();

        console.log("Step 3: Merging data and saving to DB...");
        let savedCount = 0;
        let errors = [];

        for (const ipo of ipos) {
            try {
                // Final Type Check
                if (type !== 'ALL' && ipo.ipoType !== type) continue;

                // [NEW] FILTER: Skip if status is already CLOSED or LISTED
                // We only want to process UPCOMING or OPEN IPOs for new entries.
                // FIXED: We must NOT skip here because we need to update EXISTING IPOs that just turned CLOSED.
                // if (ipo.status === 'CLOSED' || ipo.status === 'LISTED') continue;

                // Validate Registrar
                if (ipo.registrarName && ipo.registrarName !== "N/A") {
                    const matchedRegistrar = matchRegistrar(ipo.registrarName, dbRegistrars);
                    if (matchedRegistrar) ipo.registrarName = matchedRegistrar.name;
                }

                // Merge Subscription
                const subInfo = subscriptionData.find(s => isMatch(s.companyName, ipo.companyName));

                // [FIX] Force Subscription to 0 if IPO is UPCOMING
                // This prevents incorrect data from scraper (e.g. 105x for unopened IPO)
                if (ipo.status === 'UPCOMING') {
                    ipo.subscription = {
                        qib: 0, nii: 0, snii: 0, bnii: 0, retail: 0,
                        employee: 0, shareholders: 0, total: 0, applications: 0
                    };
                } else if (subInfo && subInfo.total > 0) {
                    ipo.subscription = {
                        qib: roundToTwo(subInfo.qib),
                        nii: roundToTwo(subInfo.nii),
                        snii: roundToTwo(subInfo.snii),
                        bnii: roundToTwo(subInfo.bnii),
                        retail: roundToTwo(subInfo.retail),
                        employee: roundToTwo(subInfo.employee),
                        shareholders: roundToTwo(subInfo.shareholders),
                        total: roundToTwo(subInfo.total),
                        applications: subInfo.applications
                    };
                }

                // Upsert
                let existingIPO = await Mainboard.findOne({ slug: ipo.slug });
                if (!existingIPO) {
                    const allIPOs = await Mainboard.find({}, 'companyName slug').lean();
                    let bestMatch = null;
                    let highestScore = 0;
                    for (const existing of allIPOs) {
                        let score = getSimilarity(existing.companyName, ipo.companyName);
                        if (isSubsetMatch(existing.companyName, ipo.companyName)) {
                            score = Math.max(score, 0.9);
                        }

                        if (score > highestScore) {
                            highestScore = score;
                            bestMatch = existing;
                        }
                    }
                    if (bestMatch && highestScore > 0.7) {
                        ipo.slug = bestMatch.slug;
                        existingIPO = await Mainboard.findOne({ slug: ipo.slug });
                    }
                }

                if (existingIPO) {
                    // STOP UPDATES for finalized statuses
                    if (['CLOSED', 'LISTED', 'CANCELLED'].includes(existingIPO.status)) {
                        continue;
                    }

                    // RESTRICTED UPDATE: Update GMP, Subscription, and Status
                    const updatePayload = {};

                    // 1. GMP Update Logic
                    const latestGmp = existingIPO.gmp && existingIPO.gmp.length > 0 ? existingIPO.gmp[existingIPO.gmp.length - 1] : null;
                    const newGmpPrice = ipo.gmp && ipo.gmp.length > 0 ? ipo.gmp[0].price : 0;

                    if (ipo.gmp && ipo.gmp.length > 0 && (!latestGmp || latestGmp.price !== newGmpPrice)) {
                        existingIPO.gmp.push(ipo.gmp[0]);
                        if (existingIPO.gmp.length > 30) existingIPO.gmp.shift();
                        updatePayload.gmp = existingIPO.gmp;
                    }

                    // 2. Subscription Update Logic
                    // Allow update if we have meaningful data OR if we explicitly reset it for UPCOMING
                    if (ipo.subscription && (ipo.subscription.total > 0 || ipo.status === 'UPCOMING')) {
                        updatePayload.subscription = ipo.subscription;
                    }

                    // 3. Status Update Logic (Fix for Stuck Open)
                    if (ipo.status && ipo.status !== existingIPO.status) {
                        console.log(`Status Change Detected for ${ipo.companyName}: ${existingIPO.status} -> ${ipo.status}`);
                        updatePayload.status = ipo.status;

                        // If status changed to CLOSED or LISTED, ensure allotment flag is correct
                        if (ipo.status === 'CLOSED' || ipo.status === 'LISTED') {
                            // Keep existing allotment status logic or re-evaluate? 
                            // Usually allotment comes out days after close.
                        }
                    }

                    // Apply updates if any
                    if (Object.keys(updatePayload).length > 0) {
                        await Mainboard.updateOne({ slug: ipo.slug }, { $set: updatePayload });
                    }
                } else {
                    // New IPO - Create with full data
                    // Calculate allotment flag for new IPOs
                    if (ipo.status === 'UPCOMING' || ipo.status === 'OPEN') {
                        ipo.isAllotmentOut = false;
                    } else {
                        if (ipo.allotment_date && new Date(ipo.allotment_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)) ipo.isAllotmentOut = true;
                    }

                    // CRITICAL FALLBACKS for required fields (Mongoose Validation protection)
                    const baseDate = ipo.close_date || ipo.open_date || new Date();
                    if (!ipo.listing_date) ipo.listing_date = new Date(baseDate.getTime() + 6 * 24 * 60 * 60 * 1000);
                    if (!ipo.allotment_date) ipo.allotment_date = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                    if (!ipo.refund_date) ipo.refund_date = new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000);

                    if (ipo.ipoType !== 'SME') ipo.gmp = [];

                    const newMainboard = new Mainboard(ipo);
                    await newMainboard.save();
                    console.log(`✅ Saved new IPO: ${ipo.companyName}`);
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

export const scrapeAndSaveIPOData = async (limit = 3) => {
    return await syncIPOData(limit, 'ALL');
};

export const scrapeAndSaveMainboardIPOs = async (limit = 3) => {
    // 1. Fetch rich data from Chittorgarh (Main Source)
    console.log("Step 1: Fetching detailed Mainboard IPO data from Chittorgarh...");
    const result = await syncIPOData(limit, 'MAINBOARD');

    // 2. Fetch/Update GMP from the new InvestorGain API (Source of Truth for GMP)
    try {
        console.log("Step 2: Updating Mainboard GMP from InvestorGain API...");
        await syncMainboardGMP();
    } catch (gmpError) {
        console.error("Warning: InvestorGain GMP Update Failed:", gmpError.message);
    }

    return result;
};

export const scrapeAndSaveSmeIPOs = async (limit = 100) => {
    return await syncIPOData(limit, 'SME');
};
