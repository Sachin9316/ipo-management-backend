import axios from 'axios';
import * as cheerio from 'cheerio';
import { isMatch } from '../utils/matching.js';

const HOME_URL = 'https://ipostatus.kfintech.com/';
const API_URL = 'https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query';

// Cache the IPO list in memory to avoid fetching JS on every request
let cachedIPOList = null;
let lastFetchTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch the main JS file from KFintech and parse the hardcoded IPO list.
 */
export const fetchKFintechIPOList = async () => {
    try {
        const now = Date.now();
        if (cachedIPOList && (now - lastFetchTime < CACHE_TTL)) {
            return cachedIPOList;
        }

        console.log('Fetching KFintech IPO List from source...');

        // 1. Get the Homepage to find the main JS file
        const { data: html } = await axios.get(HOME_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);
        let scriptSrc = '';

        // Find the script tag that looks like the main bundle (usually contains "main.")
        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('main.')) {
                scriptSrc = src;
            }
        });

        if (!scriptSrc) {
            console.error('Could not find main JS script on KFintech homepage.');
            return []; // Return empty or cached fallback
        }

        // Handle relative path
        if (!scriptSrc.startsWith('http')) {
            scriptSrc = HOME_URL + scriptSrc.replace(/^\//, ''); // Remove leading slash if present
        }

        console.log(`Fetching JS Bundle: ${scriptSrc}`);

        // 2. Fetch the JS file
        const { data: jsContent } = await axios.get(scriptSrc);

        // 3. Extract the array of IPOs
        // Pattern: look for array of objects with keys like 'client_id' and 'name'
        // Example minified: var t=[{client_id:"...",name:"..."},...]
        // Regex to find a JSON-like array structure containing client_id

        // Strategy: Find a snippet like `client_id:"` and trace back to `[` and forward to `]`
        // Or simplified: Extract all objects containing client_id

        // Regex Explanation:
        // Match `{` 
        // followed by anything (non-greedy)
        // match `client_id:"(\d+)"`
        // followed by anything
        // match `name:"([^"]+)"`
        // followed by anything
        // match `}`
        // This is risky on minified code. 

        // Better Strategy for KFintech specific bundle:
        // They often use a large variable assignment.
        // Let's try to capture the whole array if possible, or iterate matches.

        const ipos = [];
        // Regex to match individual object properties roughly
        // client_id:"12345",name:"ABC Corp"
        // in minified JS, quotes around keys might be missing: client_id:"...",name:"..."

        const regex = /client_id\s*:\s*"(\d+)"\s*,\s*name\s*:\s*"([^"]+)"/g;
        let match;

        while ((match = regex.exec(jsContent)) !== null) {
            ipos.push({
                clientId: match[1],
                name: match[2]
            });
        }

        if (ipos.length > 0) {
            console.log(`Found ${ipos.length} IPOs in KFintech JS.`);
            cachedIPOList = ipos;
            lastFetchTime = Date.now();
        } else {
            console.warn("Regex failed to find IPOs in KFintech JS. API structure might have changed.");
        }

        return cachedIPOList || [];

    } catch (error) {
        console.error('Error fetching KFintech IPO List:', error.message);
        return [];
    }
};

/**
 * Check allotment status for a specific IPO and PANs using hidden API.
 * @param {Object} ipo - The IPO object from DB.
 * @param {string[]} panNumbers - List of PANs to check.
 */
export const checkKFintechStatus = async (ipo, panNumbers) => {
    try {
        let targetIPO = null;
        let clientId = ipo.kfintech_client_id;

        if (clientId) {
            console.log(`Using provided Client ID: ${clientId} for "${ipo.companyName}"`);
            targetIPO = { clientId, name: ipo.companyName };
        } else {
            // 1. Get the list of IPOs
            const ipoList = await fetchKFintechIPOList();
            // 2. Find the IPO in the list
            // Fuzzy match: check if one contains the other
            targetIPO = ipoList.find(item => isMatch(item.name, ipo.companyName));

            if (!targetIPO) {
                console.warn(`IPO "${ipo.companyName}" not found in KFintech list (and no client_id provided).`);
                return {
                    summary: { allotted: 0, notAllotted: 0, error: panNumbers.length },
                    details: panNumbers.map(pan => ({ pan, status: 'UNKNOWN', message: 'IPO not found in KFintech' }))
                };
            }
            console.log(`Found "${targetIPO.name}" in scraper list (Client ID: ${targetIPO.clientId})`);
        }

        console.log(`Checking allotment for "${targetIPO.name}" (Client ID: ${targetIPO.clientId})`);

        const results = [];

        // 3. Check status for each PAN
        for (const pan of panNumbers) {
            try {
                // The API uses headers to pass params:
                // client_id: <IPO_ID>
                // reqparam: <PAN>
                // type=pan query param is constant

                // Add delay for throttling if handling many PANs
                if (panNumbers.length > 5) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                const response = await axios.get(`${API_URL}?type=pan`, {
                    headers: {
                        'client_id': targetIPO.clientId,
                        'reqparam': pan,
                        'Content-Type': 'application/json'
                    }
                });

                const parserResult = parseResponse(response.data, pan);
                results.push(parserResult);

            } catch (err) {
                console.error(`Error checking PAN ${pan}:`, err.message);
                results.push({ pan, status: 'ERROR', message: err.message });
            }
        }

        return {
            summary: {
                allotted: results.filter(r => r.status === 'ALLOTTED').length,
                notAllotted: results.filter(r => r.status === 'NOT_ALLOTTED').length,
                error: results.filter(r => r.status === 'ERROR').length
            },
            details: results
        };

    } catch (error) {
        console.error('KFintech Service Error:', error);
        throw error;
    }
};

const parseResponse = (data, pan) => {
    // Expected structure: { data: [ { All_Shares: "6", ... } ] }
    if (!data || !data.data || !Array.isArray(data.data)) {
        // KFintech sometimes sends different error structures or empty bodies on no-match
        return { pan, status: 'NOT_ALLOTTED', message: 'No record found' };
    }

    if (data.data.length === 0) {
        // Empty array usually means Not Found / Not Applied / Not Allotted yet
        return { pan, status: 'NOT_ALLOTTED', message: 'No record found' };
    }

    const rec = data.data[0];
    const allShares = parseInt(rec.All_Shares || "0");
    const appShares = parseInt(rec.App_Shares || "0");
    const dpId = rec.DP_CLID || null;

    // Name Cleaning: Remove MR./MRS./MS. prefix and trailing dots/spaces
    let name = rec.Name || "Unknown";
    name = name.replace(/^(MR\.|MRS\.|MS\.|M\/S\.)\s*/i, "") // Remove Prefix
        .trim()
        .replace(/\.+$/, "") // Remove trailing dots
        .trim();

    // Logic: User observed "App_Shares === All_Shares" implies allotment.
    // We will consider All_Shares > 0 as ALLOTTED.
    if (allShares > 0) {
        return {
            pan,
            status: 'ALLOTTED',
            units: allShares,
            message: `Allotted ${allShares} shares`,
            name: name,
            dpId: dpId
        };
    } else {
        return {
            pan,
            status: 'NOT_ALLOTTED',
            units: 0,
            message: 'Not Allotted',
            name: name,
            dpId: dpId
        };
    }
};
