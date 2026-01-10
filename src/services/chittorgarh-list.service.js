import axios from 'axios';
import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { parseCurrency, parseIssueSize, roundToTwo } from '../utils/matching.js';

// Helper: Get Date Parts
const getYear = () => new Date().getFullYear();
const getMonth = () => new Date().getMonth() + 1;
const getFinancialYear = () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    if (month >= 4) return `${year}-${(year + 1).toString().slice(-2)}`;
    return `${year - 1}-${year.toString().slice(-2)}`;
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
const calculateStatus = (open, close, listing) => {
    const now = new Date();
    if (!open) return "UPCOMING";
    if (now < open) return "UPCOMING";
    if (now >= open && now <= close) return "OPEN";
    if (now > close && (!listing || now < listing)) return "CLOSED";
    if (listing && now >= listing) return "LISTED";
    return "CLOSED";
};

// Shared Fetcher for Report 82 (List)
const fetchRawList = async () => {
    const month = getMonth();
    const currentYear = getYear();
    const fy = getFinancialYear(); // Returns e.g. "2025-26" for Jan 2026

    // We need to fetch for Current Year AND Previous Year to cover transition IPOs (e.g. Dec-Jan)
    // URL structure for Report 82 seems to be .../Year/FY/...

    // 1. Current Year (e.g. 2026, 2025-26)
    const urlCurrent = API_URL_TEMPLATE(month, currentYear, fy);

    // 2. Previous Year (e.g. 2025, 2025-26 OR 2024-25??)
    // If we are in Jan 2026 -> FY 25-26.
    // Dec 2025 -> FY 25-26.
    // So prevYear=2025, fy=2025-26. This is valid.

    const prevYear = currentYear - 1;
    let prevFy = fy; // Default same FY

    // Verify FY logic: 
    // If today is Jan 2026 -> FY 25-26.
    // Dec 2025 -> FY 25-26.
    // So prevYear=2025, fy=2025-26. This is valid.

    const urlPrev = API_URL_TEMPLATE(month, prevYear, prevFy);

    let allData = [];

    const fetchData = async (u) => {
        try {
            const { data } = await axios.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            return (data && data.reportTableData) ? data.reportTableData : [];
        } catch (e) {
            console.error(`Error fetching list from ${u}:`, e.message);
            return [];
        }
    };

    const [dataCurrent, dataPrev] = await Promise.all([
        fetchData(urlCurrent),
        fetchData(urlPrev)
    ]);

    // Merge and Deduplicate by Company Name or Slug
    allData = [...dataCurrent, ...dataPrev];
    const unique = new Map();
    for (const item of allData) {
        if (!item['Company']) continue;
        unique.set(item['Company'], item);
    }

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

        return {
            companyName: name,
            slug: slugify(name, { lower: true, strict: true }),
            open_date: openDate,
            close_date: closeDate,
            listing_date: listingDate,
            min_price: parseFloat(stripHtml(item['Issue Price (Rs.)']).split('to')[0].trim()) || 0,
            max_price: parseFloat(stripHtml(item['Issue Price (Rs.)']).split('to')[1]?.trim()) || parseFloat(stripHtml(item['Issue Price (Rs.)'])) || 0,
            issueSize: parseIssueSize(item['Total Issue Amount (Incl.Firm reservations) (Rs.cr.)']),
            listing_at: listingAt,
            ipoType: ipoType,
            lead_manager: stripHtml(item['Left Lead Manager']),
            icon: item['~compare_image'] || '',
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
        details.lotSize = lotSizeStr ? parseInt(lotSizeStr.replace(/[^0-9]/g, '')) : 0;

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

        // Registrar Extraction (Improved)
        const findRegistrar = () => {
            // Priority 1: Main table match
            let name = getVal(['registrar', 'ipo registrar']);
            let link = linksMap.get('registrar') || linksMap.get('ipo registrar');

            if (name && name.length > 3) return { name, link };

            // Priority 2: Card structure (common in SME)
            const regCard = $('.card:contains("Registrar"), .card:contains("Maashitla"), .card:contains("Bigshare"), .card:contains("Link Intime"), .card:contains("Kfin"), .card:contains("MUFG"), .card:contains("Skyline"), .card:contains("Cameo"), .card:contains("Purva"), .card:contains("Beetal")').first();
            if (regCard.length > 0) {
                const cardLink = regCard.find('a').first();
                if (cardLink.length > 0 && cardLink.text().length > 3) {
                    return { name: cardLink.text().trim(), link: cardLink.attr('href') };
                }
            }

            // Priority 3: Header proximity
            const regHeader = $('h2, h3, b, strong').filter((i, el) => $(el).text().includes("Registrar")).first();
            if (regHeader.length > 0) {
                const parent = regHeader.parent();
                const link = parent.find('a').first();
                if (link.length > 0) {
                    return { name: link.text().trim(), link: link.attr('href') };
                }
                const text = parent.text().replace(/Registrar|:|IPO/gi, "").trim();
                if (text.length > 3) return { name: text, link: null };
            }

            return { name: 'N/A', link: null };
        };

        const foundReg = findRegistrar();
        details.registrar = foundReg.name;
        details.registrarLink = foundReg.link ? (foundReg.link.startsWith('http') ? foundReg.link : `https://www.chittorgarh.com${foundReg.link}`) : '';

        // Allotment & Other Dates
        details.allotmentDate = parseDate(getVal(['allotment', 'basis of allotment']));
        details.refundDate = parseDate(getVal(['refunds', 'initiation of refunds']));
        details.listingDate = parseDate(getVal(['listing date']));

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

        const ipoData = {
            companyName: name,
            slug: slugify(name, { lower: true, strict: true }),
            icon: item['~compare_image'] || "https://cdn-icons-png.flaticon.com/512/25/25231.png",
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
            listing_date: rListingDate || new Date(),
            refund_date: closeDate ? new Date(closeDate.getTime() + 4 * 24 * 60 * 60 * 1000) : null,
            allotment_date: closeDate ? new Date(closeDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null,

            registrarName: detail.registrar || "N/A",
            registrarLink: detail.registrarLink || "",
            lot_size: detail.lotSize,
            lot_price: detail.lotPrice || (detail.lotSize * detail.maxPrice),
            min_price: detail.minPrice > 0 ? detail.minPrice : (parseFloat(item['Issue Price (Rs.)']) || 0),
            max_price: detail.maxPrice > 0 ? detail.maxPrice : (parseFloat(item['Issue Price (Rs.)']) || 0),
            isAllotmentOut: false,
            drhp_pdf: detail.drhp || "",
            rhp_pdf: detail.rhp || "",
            link: detail.link,
            allotment_date: detail.allotmentDate || (closeDate ? new Date(closeDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null),
            refund_date: detail.refundDate || (closeDate ? new Date(closeDate.getTime() + 4 * 24 * 60 * 60 * 1000) : null),
            listing_date: detail.listingDate || rListingDate || (closeDate ? new Date(closeDate.getTime() + 6 * 24 * 60 * 60 * 1000) : null),
        };

        ipos.push(ipoData);
    }

    return ipos;
};
