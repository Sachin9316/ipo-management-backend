import axios from 'axios';
import * as cheerio from 'cheerio';
// import { chromium } from 'playwright'; // REMOVED
import { isMatch, getSimilarity } from '../utils/matching.js';

const HOME_URL = 'https://ipostatus.kfintech.com/';
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3000';

// Cache the IPO list in memory
let cachedIPOList = null;
let lastFetchTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch the main JS file from KFintech and parse the hardcoded IPO list.
 * Kept here for compatibility, but logic is also in Worker.
 */
export const fetchKFintechIPOList = async () => {
    // ... (Keep existing implementation for now as it uses axios/cheerio which works on Vercel) ...
    // ... Actually, to ensure consistency, we could proxy this to the worker too, but
    // since it's just axios+cheerio and lightweight, we can leave it or proxy it.
    // Leaving it prevents extra RTT if Vercel can do it easily.
    // But Vercel IP might be blocked? If so, worker is better.
    // Let's try to proxy to worker if possible, or fallback to local?
    // For now, leave as is, focusing on Playwright part.

    // ... (rest of fetchKFintechIPOList implementation) ...
    try {
        const now = Date.now();
        if (cachedIPOList && (now - lastFetchTime < CACHE_TTL)) {
            return cachedIPOList;
        }

        // ... (original logic) ...
        console.log('Fetching KFintech IPO List from source...');

        // 1. Get the Homepage to find the main JS file
        const { data: html } = await axios.get(HOME_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);
        let scriptSrc = '';

        $('script').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('main.')) {
                scriptSrc = src;
            }
        });

        if (!scriptSrc) {
            console.error('Could not find main JS script on KFintech homepage.');
            return [];
        }

        if (!scriptSrc.startsWith('http')) {
            scriptSrc = HOME_URL + scriptSrc.replace(/^\//, '');
        }

        console.log(`Fetching JS Bundle: ${scriptSrc}`);

        const { data: jsContent } = await axios.get(scriptSrc);

        let ipos = [];

        // Find JSON.parse containing the list
        const potentialMatches = jsContent.matchAll(/JSON\.parse\s*\(\s*'(\[\{.*?\}\])'\s*\)/g);

        for (const match of potentialMatches) {
            const jsonString = match[1];
            if (jsonString && jsonString.includes('clientId') && jsonString.includes('name')) {
                try {
                    const parsedData = JSON.parse(jsonString);
                    if (Array.isArray(parsedData) && parsedData.length > 0) {
                        ipos = parsedData.map(item => ({
                            clientId: item.clientId,
                            name: item.name
                        }));
                        console.log(`Successfully parsed ${ipos.length} IPOs from JSON string.`);
                        break;
                    }
                } catch (e) {
                    console.warn('Failed to parse potential IPO JSON string:', e.message);
                }
            }
        }

        // Fallback regex
        if (ipos.length === 0) {
            console.log('JSON.parse pattern not found, trying regex fallback...');
            const regex = /clientId\s*:\s*"(\d+)"\s*,\s*name\s*:\s*"([^"]+)"/g;
            let match;
            while ((match = regex.exec(jsContent)) !== null) {
                ipos.push({
                    clientId: match[1],
                    name: match[2]
                });
            }
        }

        if (ipos.length > 0) {
            cachedIPOList = ipos;
            lastFetchTime = Date.now();
        }

        return cachedIPOList || [];

    } catch (error) {
        console.error('Error fetching KFintech IPO List:', error.message);
        return [];
    }
};

/**
 * Check allotment status using Playwright browser automation VIA WORKER.
 */
export const checkKFintechStatus = async (ipo, panNumbers) => {
    try {
        console.log(`Delegating KFintech check for "${ipo.companyName}" to WORKER at ${WORKER_URL}`);

        const response = await axios.post(`${WORKER_URL}/check-status`, {
            ipoName: ipo.companyName,
            clientId: ipo.kfintech_client_id, // Pass if available
            panNumbers
        });

        return response.data;
    } catch (error) {
        console.error('Error calling KFintech Worker:', error.message);
        if (error.response) {
            console.error('Worker Response:', error.response.data);
        }

        return {
            summary: { allotted: 0, notAllotted: 0, error: panNumbers.length },
            details: panNumbers.map(pan => ({ pan, status: 'ERROR', message: 'Worker Request Failed' }))
        };
    }
};
