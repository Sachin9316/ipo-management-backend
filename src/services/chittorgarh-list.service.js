import axios from 'axios';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { parseCurrency, parseIssueSize, roundToTwo } from '../utils/matching.js';

// Helper: Get Date Parts
const getYear = () => new Date().getFullYear();
const getMonth = () => new Date().getMonth() + 1;
const getFinancialYear = () => {
    const year = new Date().getFullYear();
    // API Quirk: Generally expects current year - next year (e.g., 2026 -> 2026-27)
    // independent of the actual financial year start in April.
    return `${year}-${(year + 1).toString().slice(-2)}`;
};

const API_URL_TEMPLATE = (month, year, fy) => `https://webnodejs.chittorgarh.com/cloud/report/data-read/82/1/1/${year}/${fy}/0/all/0?search=&v=16-05`;

export const stripHtml = (html) => {
    if (!html) return "";
    let clean = html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    // User Request: Remove extra words after dot/Ltd (e.g. "Ltd. IPO CT")
    // Also remove "IPO" suffix if present
    clean = clean.replace(/(?:Ltd\.|Limited)[\s\S]*$/i, (match) => match.match(/Ltd\.|Limited/i)[0]);
    clean = clean.replace(/\s+IPO\s*$/i, '');
    return clean.trim();
};

// Helper: Parse Date (e.g., "Dec 24, 2025" -> Date)
const parseDate = (str) => {
    if (!str || str.toLowerCase().includes('na')) return null;
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date;
};

// Helper: Calculate status
// Helper: Calculate status based on dates with strict 5 PM IST cutoff
const calculateStatus = (open, close, listing) => {
    // 1. Get Current IST Time as a "Wall Clock" Date object
    // This ensures that valid IST time components are used regardless of server timezone
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const openDate = open ? new Date(open) : null;
    const closeDate = close ? new Date(close) : null;
    const listingDate = listing ? new Date(listing) : null;

    if (openDate) openDate.setHours(0, 0, 0, 0);
    if (closeDate) closeDate.setHours(0, 0, 0, 0);
    if (listingDate) listingDate.setHours(0, 0, 0, 0);

    // Logic
    if (listingDate && nowIST >= listingDate) return "LISTED";

    if (openDate && nowIST >= openDate) {
        if (!closeDate) return "OPEN";

        const todayIST = new Date(nowIST);
        todayIST.setHours(0, 0, 0, 0);

        if (todayIST < closeDate) {
            return "OPEN";
        } else if (todayIST.getTime() === closeDate.getTime()) {
            // On Closing Date: Check 5 PM IST Cutoff
            if (nowIST.getHours() < 17) return "OPEN";
            else return "CLOSED";
        } else {
            return "CLOSED";
        }
    }

    if (openDate && nowIST < openDate) return "UPCOMING";
    return "CLOSED";
};

// Helper: Get Potential FY Strings
// Returns array of FY strings to try: ["2026-27", "2025-26"]
const getPotentialFYs = (year) => {
    const next = (year + 1).toString().slice(-2);
    const curr = year.toString().slice(-2);
    const prev = (year - 1).toString().slice(-2);

    // Priority 1: Year-(Year+1) (e.g. 2026-27) - Seems to be the new pattern
    // Priority 2: (Year-1)-Year (e.g. 2025-26) - Standard FY pattern
    return [
        `${year}-${next}`,
        `${year - 1}-${curr}`
    ];
};

// Shared Fetcher for Report 82 (List)
const fetchRawList = async () => {
    const month = getMonth();
    const currentYear = getYear();

    // We want to probe:
    // 1. Current Year (e.g. 2026) -> try FY 2026-27, 2025-26
    // 2. Previous Year (e.g. 2025) -> try FY 2025-26, 2024-25
    const yearsToProbe = [currentYear, currentYear - 1];
    const urlsToFetch = new Set(); // Use Set to avoid duplicate URLs

    for (const year of yearsToProbe) {
        const fys = getPotentialFYs(year);
        for (const fy of fys) {
            urlsToFetch.add(API_URL_TEMPLATE(month, year, fy));
        }
    }

    /*
    console.log('Dynamic Scraper Probing:');
    urlsToFetch.forEach(u => console.log(' - ' + u));
    */

    const fetchData = async (u) => {
        try {
            const { data } = await axios.get(u, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            });
            return (data && data.reportTableData) ? data.reportTableData : [];
        } catch (e) {
            // console.error(`Failed probe to ${u}:`, e.message);
            return [];
        }
    };

    const promises = Array.from(urlsToFetch).map(url => fetchData(url));
    const results = await Promise.all(promises);

    // Merge and Deduplicate by Company Name
    let allData = [];
    results.forEach(group => {
        if (Array.isArray(group)) allData.push(...group);
    });

    const unique = new Map();
    for (const item of allData) {
        if (!item['Company']) continue;
        unique.set(item['Company'], item);
    }

    /*
    console.log(`Merged ${allData.length} raw records into ${unique.size} unique IPOs.`);
    */

    return Array.from(unique.values());
};

export const fetchChittorgarhAPIData = async (type = 'ALL') => {
    const rawData = await fetchRawList();
    return rawData.map(item => {
        let name = stripHtml(item['Company']);
        name = name.replace(/ IPO$/, "").trim();

        // Determine type from 'Listing at'
        const listingAt = stripHtml(item['Listing at'] || '');
        let ipoType = 'MAINBOARD'; // Default

        if (listingAt.toLowerCase().includes('sme')) {
            ipoType = 'SME';
        } else if (listingAt === '' || listingAt.toLowerCase() === 'na') {
            // If listing info is missing, try heuristics or leave as is if possible
            // But for the API list, it usually means it's Mainboard unless stated otherwise
            ipoType = 'MAINBOARD';
        }

        if (type !== 'ALL' && ipoType !== type) return null; // Filter

        const openDate = parseDate(item['Opening Date']);
        const closeDate = parseDate(item['Closing Date']);
        const listingDate = parseDate(item['Listing Date']);

        // Fix Icon URL: Prepend base URL if relative
        let iconUrl = item['~compare_image'] || '';
        if (iconUrl && iconUrl.startsWith('/')) {
            iconUrl = `https://www.chittorgarh.net${iconUrl}`;
        }

        return {
            companyName: name,
            slug: slugify(name, { lower: true, strict: true }),
            open_date: openDate,
            close_date: closeDate,
            listing_date: listingDate,
            min_price: parseFloat(stripHtml(item['Issue Price (Rs.)']).split(/(?:\s+to\s+|\s*-\s*)/i)[0].trim()) || 0,
            max_price: parseFloat(stripHtml(item['Issue Price (Rs.)']).split(/(?:\s+to\s+|\s*-\s*)/i)[1]?.trim()) || parseFloat(stripHtml(item['Issue Price (Rs.)'])) || 0,
            issueSize: parseIssueSize(item['Total Issue Amount (Incl.Firm reservations) (Rs.cr.)']),
            listing_at: listingAt,
            ipoType: ipoType,
            lead_manager: stripHtml(item['Left Lead Manager']),
            icon: iconUrl,
            // Pass through hidden keys for scraping
            '~URLRewrite_Folder_Name': item['~URLRewrite_Folder_Name'],
            '~id': item['~id'],
            link: `https://www.chittorgarh.com/ipo/${item['~URLRewrite_Folder_Name']}/${item['~id']}/`
        };
    }).filter(item => item !== null); // Remove nulls
};

// Helper to extract Lot Size and other details
export const scrapeChittorgarhDetail = async (ipoObj) => {
    let id = ipoObj['~id'];
    if (!id && ipoObj['Company']) {
        const idMatch = ipoObj['Company'].match(/\/(\d+)\//);
        if (idMatch) id = idMatch[1];
    }
    const link = `https://www.chittorgarh.com/ipo/${ipoObj['~URLRewrite_Folder_Name']}/${id}/`;

    let details = {
        lotSize: 0,
        registrar: '',
        registrarLink: '',
        link: link,
        minPrice: 0,
        maxPrice: 0,
        lotPrice: 0,
        rhp: '',
        drhp: '',
        allotmentDate: null,
        refundDate: null,
        listingDate: null,
        listingDate: null
    };

    try {
        const { data } = await axios.get(link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const dataMap = new Map();
        const linksMap = new Map();

        // 0. Extract Logo (Removed: using API response per user request)
        // Logo is strictly taken from the 'listIcon' (API field) in the main loop.

        // 1. Universal Table Scraper
        $('table').each((i, table) => {
            $(table).find('tr').each((j, row) => {
                const cells = $(row).find('td, th');
                if (cells.length >= 2) {
                    let key = $(cells[0]).text().trim().replace(/[:?]/g, '');
                    let value = $(cells[1]).text().trim();
                    const normalizedKey = key.toLowerCase().replace(/\s+/g, ' ');

                    if (normalizedKey && value) {
                        dataMap.set(normalizedKey, value);
                        const link = $(cells[1]).find('a').attr('href');
                        if (link) linksMap.set(normalizedKey, link);
                    }
                }
            });
        });

        const getVal = (keys) => {
            for (const k of keys) {
                if (dataMap.has(k)) return dataMap.get(k);
            }
            return null;
        };

        // 2. Extract Data
        const priceRange = getVal(['price band', 'issue price', 'price']);
        const lotSizeStr = getVal(['lot size', 'minimum order quantity', 'market lot']);
        // Fix: Handle "1,600 Shares" format
        details.lotSize = lotSizeStr ? parseInt(lotSizeStr.replace(/,/g, '').replace(/\D/g, '')) : 0;

        // Price Calculation
        if (priceRange) {
            const prices = priceRange.match(/(\d+[\d,]*(\.\d+)?)/g);
            if (prices) {
                const numericPrices = prices.map(p => parseFloat(p.replace(/,/g, '')));
                details.minPrice = Math.min(...numericPrices);
                details.maxPrice = Math.max(...numericPrices);
                details.lotPrice = details.maxPrice * details.lotSize;
            }
        }

        // Registrar: Set to N/A as per user request (manual management)
        details.registrar = 'N/A';
        details.registrarLink = '';

        // Allotment & Other Dates
        details.allotmentDate = parseDate(getVal(['allotment', 'basis of allotment']));
        details.refundDate = parseDate(getVal(['refunds', 'initiation of refunds']));
        details.listingDate = parseDate(getVal(['listing date']));

        // Listing Data Extraction (New)
        const parseCurrencyLocal = (val) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[^\d.]/g, '')) || 0;
        };

        details.listingOpen = parseCurrencyLocal(getVal(['open', 'listing price']));
        details.listingHigh = parseCurrencyLocal(getVal(['high', 'day high']));
        details.listingLow = parseCurrencyLocal(getVal(['low', 'day low']));
        details.listingClose = parseCurrencyLocal(getVal(['close', 'last', 'market close']));

        return details;

    } catch (error) {
        console.error(`Error scraping detail for ${ipoObj['Company Name'] || ipoObj['Company']}:`, error.message);
        return null;
    }
};

export const scrapeChittorgarhIPOs = async (limit = 5, type = 'ALL') => {
    console.log('Fetching Chittorgarh List (Report 82)...');
    const rawList = await fetchRawList();

    // Sort by open date descending
    rawList.sort((a, b) => {
        const dateA = parseDate(a['~Issue_Open_Date'] || a['Opening Date'] || 0);
        const dateB = parseDate(b['~Issue_Open_Date'] || b['Opening Date'] || 0);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
    });

    const processList = rawList.slice(0, limit);
    const ipos = [];

    for (const item of processList) {
        let name = stripHtml(item['Company']);
        name = name.replace(/ IPO$/, "").trim();

        if (!name) continue;

        console.log(`Processing Chittorgarh IPO: ${name}`);
        const detail = await scrapeChittorgarhDetail(item);
        if (!detail) continue;

        // Map fields
        const openDate = parseDate(item['Opening Date'] || item['~Issue_Open_Date']);
        const closeDate = parseDate(item['Closing Date'] || item['~Issue_Close_Date']);

        const rListingDate = parseDate(item['Listing Date'] || item['~ListingDate']);

        const finalStatus = calculateStatus(openDate, closeDate, rListingDate);

        // Determine type from 'Listing at' or Lot Size Heuristic
        const listingAt = stripHtml(item['Listing at']);
        const isSME = listingAt.toLowerCase().includes('sme') || (detail && detail.lotPrice > 50000);
        const ipoType = isSME ? 'SME' : 'MAINBOARD';

        if (type !== 'ALL' && ipoType !== type) continue;

        // [USER REQUEST] SME IPOs require minimum 2 lots
        if (ipoType === 'SME' && detail) {
            detail.lotSize = detail.lotSize * 2;
            detail.lotPrice = detail.lotPrice * 2;
        }

        // Fix Icon URL from List if relative
        let listIcon = item['~compare_image'] || "";
        if (listIcon && listIcon.startsWith('/')) {
            listIcon = `https://www.chittorgarh.net${listIcon}`;
        }

        const finalIcon = listIcon || "https://cdn-icons-png.flaticon.com/512/25/25231.png";

        // Listing Gain Calculation
        // Use listingOpen as the primary "Listing Price"
        const finalIssuePrice = detail.maxPrice > 0 ? detail.maxPrice : (parseFloat(item['Issue Price (Rs.)']) || 0);
        let listingPrice = detail.listingOpen || 0;

        let listingGain = 0;
        let listingGainPercent = 0;

        if (listingPrice > 0 && finalIssuePrice > 0) {
            listingGain = listingPrice - finalIssuePrice;
            listingGainPercent = (listingGain / finalIssuePrice) * 100;
        }

        const ipoData = {
            companyName: name,
            slug: slugify(name, { lower: true, strict: true }),
            icon: finalIcon,
            ipoType: ipoType,
            status: finalStatus,
            gmp: [],
            issueSize: parseIssueSize(item['Total Issue Amount (Incl.Firm reservations) (Rs.cr.)']),
            subscription: {
                qib: roundToTwo(item['QIB (x)']),
                nii: roundToTwo(item['NII (x)']),
                snii: roundToTwo(item['sNII (x)']),
                bnii: roundToTwo(item['bNII (x)']),
                retail: roundToTwo(item['Retail (x)']),
                employee: roundToTwo(item['Employee (x)']),
                total: roundToTwo(item['Total (x)'])
            },
            open_date: openDate || new Date(),
            close_date: closeDate || new Date(),
            listing_date: rListingDate || (closeDate ? new Date(closeDate.getTime() + 6 * 24 * 60 * 60 * 1000) : new Date()),
            refund_date: closeDate ? new Date(closeDate.getTime() + 4 * 24 * 60 * 60 * 1000) : new Date(),
            allotment_date: closeDate ? new Date(closeDate.getTime() + 3 * 24 * 60 * 60 * 1000) : new Date(),

            registrarName: detail.registrar || "N/A",
            registrarLink: detail.registrarLink || "",
            lot_size: detail.lotSize,
            lot_price: detail.lotPrice || (detail.lotSize * finalIssuePrice),
            min_price: detail.minPrice > 0 ? detail.minPrice : (parseFloat(item['Issue Price (Rs.)']) || 0),
            max_price: finalIssuePrice,
            isAllotmentOut: false,
            drhp_pdf: detail.drhp || "",
            rhp_pdf: detail.rhp || "",
            link: detail.link,
            // Enhanced Listing Info
            listing_info: {
                listing_price: listingPrice,
                listing_gain: roundToTwo(listingGain),
                listing_gain_percent: roundToTwo(listingGainPercent),
                day_high: detail.listingHigh || 0,
                day_low: detail.listingLow || 0,
                market_close: detail.listingClose || 0
            },
            // Note: These below were redundant or intended as overrides, simplifying to ensure they aren't null
        };

        // Final Date Refinement from Details if available
        if (detail.allotmentDate) ipoData.allotment_date = detail.allotmentDate;
        if (detail.refundDate) ipoData.refund_date = detail.refundDate;
        if (detail.listingDate) ipoData.listing_date = detail.listingDate;

        ipos.push(ipoData);
    }

    return ipos;
};
