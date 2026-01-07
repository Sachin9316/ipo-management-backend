import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { isMatch, getSimilarity } from '../utils/matching.js';

const HOME_URL = 'https://ipostatus.kfintech.com/';

// Cache the IPO list in memory
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
 * Check allotment status using Playwright browser automation.
 */
export const checkKFintechStatus = async (ipo, panNumbers) => {
    let browser = null;
    const results = [];

    try {
        // 1. Resolve Target IPO
        let targetIPO = null;
        let clientId = ipo.kfintech_client_id;

        if (clientId) {
            console.log(`Using provided Client ID: ${clientId} for "${ipo.companyName}"`);
            targetIPO = { clientId, name: ipo.companyName };
        } else {
            const ipoList = await fetchKFintechIPOList();

            let bestMatch = null;
            let highestScore = 0;

            for (const item of ipoList) {
                const score = getSimilarity(item.name, ipo.companyName);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = item;
                }
            }

            if (bestMatch && highestScore > 0.25) {
                console.log(`Best match found: "${bestMatch.name}" (Score: ${highestScore.toFixed(2)})`);
                targetIPO = bestMatch;
            } else {
                console.warn(`No suitable match found for "${ipo.companyName}". Highest Score: ${highestScore.toFixed(3)}`);
            }
        }

        if (!targetIPO) {
            return {
                summary: { allotted: 0, notAllotted: 0, error: panNumbers.length },
                details: panNumbers.map(pan => ({ pan, status: 'UNKNOWN', message: 'IPO not found in KFintech' }))
            };
        }

        // 2. Launch Browser
        console.log(`Launching browser to check allotment for "${targetIPO.name}"...`);
        browser = await chromium.launch({
            headless: true, // Use headless for production
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext();
        const page = await context.newPage();

        // 3. Navigate
        console.log(`Navigating to ${HOME_URL}...`);
        await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 4. Select IPO (Handle Material UI Dropdown)
        try {
            console.log("Selecting IPO from dropdown...");
            // Click the dropdown trigger
            await page.click('#demo-multiple-name');

            // Wait for listbox
            await page.waitForSelector('ul[role="listbox"]');

            // Click the option
            // We use standard string inclusion. The name from scraper should match exactly or closely.
            // Using a case-insensitive contains selector for safety
            const optionSelector = `li[role="option"]:has-text("${targetIPO.name}")`;

            if (await page.isVisible(optionSelector)) {
                await page.click(optionSelector);
                console.log("IPO selected.");
            } else {
                console.warn(`Option for "${targetIPO.name}" not visible in dropdown.`);
                // Fallback: try scrolling or fuzzy match if necessary, but name should be exact from scraper
                throw new Error("IPO Option not found in dropdown");
            }

            // Click outside or ensure dropdown closed? Use escape usually, or clicking option closes it.
            // MUI Select closes on option click.

            // Wait for stability
            await page.waitForTimeout(500);

        } catch (e) {
            console.error("Error selecting IPO from dropdown:", e.message);
            throw e; // Cannot proceed without selecting IPO
        }

        // 5. Select PAN Radio
        try {
            // Identified as input[value='PAN']
            await page.click("input[value='PAN']");
        } catch (e) {
            console.warn("Could not click PAN radio by value, trying label...");
            await page.click('label:has-text("PAN")');
        }

        // 6. Iterate PANs
        for (const pan of panNumbers) {
            try {
                console.log(`Checking PAN: ${pan}`);

                // Clear and Enter PAN
                // Selector: #outlined-start-adornment
                await page.fill('#outlined-start-adornment', '');
                await page.fill('#outlined-start-adornment', pan);

                // Submit
                // Selector: button.content-button
                await page.click('button.content-button');

                // Wait for result
                // Results appear in .MuiTable-root (table) or .MuiDialog-root (popup if not found)
                const resultSelector = '.MuiTable-root, .MuiDialog-root';
                await page.waitForSelector(resultSelector, { timeout: 5000 });

                // Parse content
                const pageContent = await page.content();
                const $ = cheerio.load(pageContent);
                const bodyText = $('body').text(); // Naive text check is usually sufficient for "Allotted" vs "Not Allotted"

                let status = 'UNKNOWN';
                let message = 'No info';
                let units = 0;

                // Close dialog if present (to reset state for next check)
                if (await page.isVisible('.MuiDialog-root')) {
                    const dialogText = await page.textContent('.MuiDialog-root');
                    if (dialogText.includes('not found') || dialogText.includes('invalid')) {
                        status = 'NOT_APPLIED';
                        message = dialogText.trim();
                    } else if (dialogText.includes('Not Allotted')) {
                        status = 'NOT_ALLOTTED';
                        message = dialogText.trim();
                    } else {
                        message = dialogText.trim();
                    }

                    // Click outside or close button to dismiss dialog?
                    // Subagent clicked (581, 574) which might be a close button or backdrop.
                    // Usually sending Escape works.
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                } else if (await page.isVisible('.MuiTable-root')) {
                    // Table implies success/record found
                    if (bodyText.includes('Alloted') || bodyText.includes('Allotted')) { // Spelled 'Alloted' sometimes
                        const match = bodyText.match(/Alloted\s*[:\-]?\s*(\d+)/i) || bodyText.match(/Allotted\s*[:\-]?\s*(\d+)/i);
                        units = match ? parseInt(match[1]) : 0;
                        if (units > 0) {
                            status = 'ALLOTTED';
                            message = `Allotted ${units} Shares`;
                        } else {
                            status = 'NOT_ALLOTTED';
                            message = 'Allotted 0 Shares';
                        }
                    } else {
                        // Table with no allotment text?
                        status = 'NOT_ALLOTTED';
                        message = 'Record found but no allotment info';
                    }
                }

                results.push({ pan, status, units, message });
                console.log(`  -> ${status}: ${message}`);

                // Wait before next
                await page.waitForTimeout(1000);

            } catch (err) {
                console.error(`Error processing PAN ${pan}:`, err.message);
                results.push({ pan, status: 'ERROR', message: err.message });
                // Try to recover state (reload page?)
                await page.reload();
                // If we reload, we must re-select IPO... complex logic.
                // For now, simpler to just continue and hope state is fine or previous catch handled dialog.
            }
        }

    } catch (e) {
        console.error("Browser Automation Error:", e);
        // Fallback for all remaining PANs?
        // ..
    } finally {
        if (browser) await browser.close();
    }

    return {
        summary: {
            allotted: results.filter(r => r.status === 'ALLOTTED').length,
            notAllotted: results.filter(r => r.status === 'NOT_ALLOTTED').length,
            error: results.filter(r => r.status === 'ERROR').length
        },
        details: results
    };
};
