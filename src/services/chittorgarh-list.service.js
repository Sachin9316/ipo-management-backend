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

const MAINBOARD_URL_TEMPLATE = (month, year, fy) => `https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/${month}/${year}/${fy}/0/0/0?search=&v=21-21`;
const API_URL_TEMPLATE = (month, year, fy) => `https://webnodejs.chittorgarh.com/cloud/report/data-read/82/1/1/${year}/${fy}/0/all/0?search=&v=16-05`;

const stripHtml = (html) => {
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

export const fetchChittorgarhMainboardList = async () => {
    const month = getMonth();
    const year = getYear();
    const fy = getFinancialYear();
    const url = MAINBOARD_URL_TEMPLATE(month, year, fy);

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (data && data.reportTableData) {
            return data.reportTableData;
        }
        return [];
    } catch (error) {
        console.error('Chittorgarh List API Error:', error.message);
        return [];
    }
};

export const fetchChittorgarhAPIData = async () => {
    // Note: The API seems to rely on the Year and Financial Year.
    // The user's example used 2026 and 2025-26 for report 82.
    // We will use our helper functions but ensure we cover the relevant period.
    const year = getYear();
    const fy = getFinancialYear();
    // Using simple month=1 placeholder as per user's URL 82/1/1... though URL template might not use month for this report?
    // User URL: .../82/1/1/2026/2025-26/...
    // Let's stick to the user's structure.

    // We might want to fetch for current year AND next year/fy if close to transition?
    // For now, let's just fetch for standard derived values.
    const url = API_URL_TEMPLATE(1, year, fy);

    try {
        console.log(`Fetching Chittorgarh API Data from: ${url}`);
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (data && data.reportTableData) {
            return data.reportTableData.map(item => {
                const openDate = parseDate(item['~Issue_Open_Date']);
                const closeDate = parseDate(item['~IssueCloseDate']);
                const listingDate = parseDate(item['~ListingDate']);

                return {
                    companyName: stripHtml(item['Company']),
                    slug: slugify(stripHtml(item['Company']), { lower: true, strict: true }),
                    open_date: openDate,
                    close_date: closeDate,
                    listing_date: listingDate,
                    min_price: parseFloat(stripHtml(item['Issue Price (Rs.)']).split('to')[0].trim()) || 0,
                    max_price: parseFloat(stripHtml(item['Issue Price (Rs.)']).split('to')[1]?.trim()) || parseFloat(stripHtml(item['Issue Price (Rs.)'])) || 0,
                    issueSize: parseIssueSize(item['Total Issue Amount (Incl.Firm reservations) (Rs.cr.)']),
                    listing_at: stripHtml(item['Listing at']),
                    lead_manager: stripHtml(item['Left Lead Manager']),
                    icon: item['~compare_image'] || ''
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Chittorgarh API Fetch Error:', error.message);
        return [];
    }
};

export const scrapeChittorgarhDetail = async (ipoObj) => {
    const link = `https://www.chittorgarh.com/ipo/${ipoObj['~URLRewrite_Folder_Name']}/${ipoObj['~id']}/`;

    try {
        const { data } = await axios.get(link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        const details = {
            listingDate: null,
            priceBand: null,
            issuePrice: null,
            lotSize: 0,
            registrar: '',
            registrarLink: '',
            listingAt: '',
            rhp: '',
            drhp: ''
        };

        $('table tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length >= 2) {
                const label = $(tds[0]).text().trim();
                const value = $(tds[1]).text().trim();

                if (label.includes('Listing Date')) details.listingDate = parseDate(value);
                else if (label.includes('Price Band')) details.priceBand = value;
                else if (label.includes('Issue Price')) details.issuePrice = value;
                else if (label.includes('Lot Size')) { // "128 Shares"
                    details.lotSize = parseInt(value.replace(/,/g, '')) || 0;
                }
                else if (label.includes('Registrar')) {
                    details.registrar = value;
                    details.registrarLink = $(tds[1]).find('a').attr('href') || '';
                }
                else if (label.includes('Listing At')) details.listingAt = value; // "BSE, NSE"
            }
        });

        // Find Prospectus
        $('a').each((i, el) => {
            const text = $(el).text().trim().toLowerCase();
            if (text.includes('rhp') && !text.includes('draft')) details.rhp = $(el).attr('href');
            if (text.includes('drhp') || text.includes('draft prospectus')) details.drhp = $(el).attr('href');
        });

        // Parse Prices
        const priceStr = details.priceBand || details.issuePrice || "0";
        const cleanPriceRange = priceStr.replace(/,/g, '');
        const priceMatch = cleanPriceRange.match(/(\d+(?:\.\d+)?)(?:\s*to\s*[^\d]*(\d+(?:\.\d+)?))?/);
        const minPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
        const maxPrice = priceMatch && priceMatch[2] ? parseFloat(priceMatch[2]) : minPrice;

        return {
            ...details,
            minPrice,
            maxPrice,
            link
        };

    } catch (error) {
        console.error(`Error scraping detail for ${ipoObj['Company Name']}:`, error.message);
        return null;
    }
};

export const scrapeChittorgarhIPOs = async (limit = 5) => {
    console.log('Fetching Chittorgarh Mainboard List...');
    const rawList = await fetchChittorgarhMainboardList();

    // Sort by open date descending (if available) or assume API order is roughly chronological
    // The API returns most recent? Let's take top N
    const processList = rawList.slice(0, limit);
    const ipos = [];

    for (const item of processList) {
        const name = item['Company Name'];
        if (!name) continue;

        console.log(`Processing Chittorgarh IPO: ${name}`);
        const detail = await scrapeChittorgarhDetail(item);
        if (!detail) continue;

        // Map fields
        const openDate = parseDate(item['~Issue_Open_Date']);
        const closeDate = parseDate(item['~Issue_Close_Date']);
        const listingDate = detail.listingDate;
        // Approximation for unknown dates
        const allotmentDate = closeDate ? new Date(closeDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null;
        const refundDate = closeDate ? new Date(closeDate.getTime() + 4 * 24 * 60 * 60 * 1000) : null;

        const finalStatus = calculateStatus(openDate, closeDate, listingDate);

        const ipoData = {
            companyName: name,
            slug: slugify(name, { lower: true, strict: true }),
            icon: "https://cdn-icons-png.flaticon.com/512/25/25231.png",
            ipoType: "MAINBOARD",
            status: finalStatus,
            gmp: [], // EXPLICITLY EMPTY
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
            listing_date: listingDate || new Date(),
            refund_date: refundDate || new Date(),
            allotment_date: allotmentDate || new Date(),
            registrarName: detail.registrar || "N/A",
            registrarLink: detail.registrarLink || "",
            lot_size: detail.lotSize,
            lot_price: (detail.lotSize * detail.maxPrice),
            min_price: detail.minPrice,
            max_price: detail.maxPrice,
            bse_code_nse_code: detail.listingAt || "BSE, NSE",
            isAllotmentOut: false,
            drhp_pdf: detail.drhp || "",
            rhp_pdf: detail.rhp || "",
            link: detail.link
        };

        ipos.push(ipoData);
    }

    return ipos;
};
