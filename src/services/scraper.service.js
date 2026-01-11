import axios from 'axios';
import { syncMainboardGMP } from './gmp-scraper.service.js';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import Mainboard from '../models/mainboard.model.js';
import Registrar from '../models/Registrar.js';
import { matchRegistrar } from '../utils/registrar-matcher.js';
import { isMatch, parseCurrency, parseIssueSize, roundToTwo, getSimilarity } from '../utils/matching.js';

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
import { scrapeChittorgarhIPOs, fetchChittorgarhAPIData, stripHtml } from './chittorgarh-list.service.js';


// Helper: Cleanup old IPOs
export const cleanupOldIPOs = async () => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

        const result = await Mainboard.deleteMany({
            close_date: { $lt: cutoffDate }
        });

        console.log(`Cleanup: Deleted ${result.deletedCount} old IPOs (closed before ${cutoffDate.toISOString().split('T')[0]}).`);
        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up old IPOs:', error);
        return 0;
    }
};

// Shared Sync Logic to avoid Code Duplication
const syncIPOData = async (limit, type) => {
    try {
        console.log(`Starting ${type} Sync...`);

        // 0. Cleanup old data first (Global cleanup is fine)
        // await cleanupOldIPOs(); // DISABLE CLEANUP: Preserving old IPOs as per user request to see listed ones

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
            if (type !== 'ALL' && itemType !== type) return;

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
            if (type !== 'ALL' && scraped.ipoType !== type) return;

            let match = ipoMap.get(scraped.slug);
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
                if (bestScore > 0.3 && bestSlug) match = ipoMap.get(bestSlug);
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
            if (type !== 'ALL' && legacy.ipoType !== type) return;

            let match = ipoMap.get(legacy.slug);
            if (!match) {
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

                // Validate Registrar
                if (ipo.registrarName && ipo.registrarName !== "N/A") {
                    const matchedRegistrar = matchRegistrar(ipo.registrarName, dbRegistrars);
                    if (matchedRegistrar) ipo.registrarName = matchedRegistrar.name;
                }

                // Merge Subscription
                const subInfo = subscriptionData.find(s => isMatch(s.companyName, ipo.companyName));
                if (subInfo && subInfo.total > 0) {
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
                        const score = getSimilarity(existing.companyName, ipo.companyName);
                        if (score > highestScore) {
                            highestScore = score;
                            bestMatch = existing;
                        }
                    }
                    if (bestMatch && highestScore > 0.3) {
                        ipo.slug = bestMatch.slug;
                        existingIPO = await Mainboard.findOne({ slug: ipo.slug });
                    }
                }

                if (ipo.status === 'UPCOMING' || ipo.status === 'OPEN') {
                    ipo.isAllotmentOut = false;
                } else {
                    if (new Date(ipo.allotment_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)) ipo.isAllotmentOut = true;
                    if (existingIPO && existingIPO.isAllotmentOut) ipo.isAllotmentOut = true;
                }

                if (existingIPO) {
                    if (ipo.ipoType === 'SME') {
                        const latestGmp = existingIPO.gmp && existingIPO.gmp.length > 0 ? existingIPO.gmp[existingIPO.gmp.length - 1] : null;
                        const newGmpPrice = ipo.gmp && ipo.gmp.length > 0 ? ipo.gmp[0].price : 0;

                        if (ipo.gmp && ipo.gmp.length > 0 && (!latestGmp || latestGmp.price !== newGmpPrice)) {
                            existingIPO.gmp.push(ipo.gmp[0]);
                            if (existingIPO.gmp.length > 30) existingIPO.gmp.shift();
                        }
                    }

                    // Destructure to separate fields we want to check before updating
                    // PROTECTED FIELDS: companyName, registrarName, ipoType, icon (Manual Management / Anti-Overwrite)
                    const { gmp, ipoType, registrarName, companyName, subscription, lot_size, lot_price, issueSize, icon, ...otherData } = ipo;

                    const updateData = { ...otherData, gmp: existingIPO.gmp };

                    // PROTECT ICON: Don't overwrite a real logo with a placeholder
                    if (existingIPO.icon && existingIPO.icon !== DEFAULT_ICON) {
                        // Keep DB icon (Goal: dont update those logos which have the company-image)
                        updateData.icon = existingIPO.icon;
                    } else if (icon && icon !== DEFAULT_ICON) {
                        // Update to new real icon (Goal: if we have default logo ... replace it with chiittorghar company-image)
                        updateData.icon = icon;
                    } else {
                        // Fallback to existing
                        updateData.icon = existingIPO.icon || DEFAULT_ICON;
                    }

                    // PRESERVE RICH DATA: Do not overwrite with zeros/empty if we already have data
                    if (subscription && subscription.total > 0) {
                        updateData.subscription = subscription;
                    } else if (existingIPO.subscription && existingIPO.subscription.total > 0) {
                        updateData.subscription = existingIPO.subscription;
                    }

                    if (lot_size > 0) updateData.lot_size = lot_size;
                    else if (existingIPO.lot_size > 0) updateData.lot_size = existingIPO.lot_size;

                    if (lot_price > 0) updateData.lot_price = lot_price;
                    else if (existingIPO.lot_price > 0) updateData.lot_price = existingIPO.lot_price;

                    if (issueSize && issueSize !== "0.00" && issueSize !== "0") updateData.issueSize = issueSize;
                    else if (existingIPO.issueSize && existingIPO.issueSize !== "0.00") updateData.issueSize = existingIPO.issueSize;

                    // Only update Registrar if it's missing or N/A in DB
                    if (!existingIPO.registrarName || existingIPO.registrarName === 'N/A') {
                        if (registrarName && registrarName !== 'N/A') {
                            updateData.registrarName = registrarName;
                        }
                    }

                    // Only update IPO Type if it's currently invalid/missing in DB
                    // If user manually set it to SME or MAINBOARD, we respect that.
                    if (!existingIPO.ipoType || existingIPO.ipoType === 'N/A') {
                        updateData.ipoType = ipoType;
                    }

                    await Mainboard.updateOne({ slug: ipo.slug }, { $set: updateData });
                } else {
                    if (ipo.ipoType !== 'SME') ipo.gmp = [];
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
