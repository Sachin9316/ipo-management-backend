
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { getSimilarity } from '../utils/matching.js';

const MUFG_URL = 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html';

// Selectors
const SEL_IPO_DROPDOWN = 'select[name="ddlCompany"]';
const SEL_RADIO_PAN = 'input[type="radio"][value="PAN"]';
const SEL_INPUT = 'input#txtStat';
const SEL_SUBMIT = 'input#btnsearc';
const SEL_RESULT_MODAL = '#dialog';
const SEL_RESULT_MSG = '#lblMessage';
const SEL_RESULT_GRID = '#tbl_DetSec';

export const fetchMUFGIPOList = async () => {
    let browser = null;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(MUFG_URL, { waitUntil: 'networkidle' });

        // Extract options from dropdown
        const options = await page.$$eval(`${SEL_IPO_DROPDOWN} option`, (opts) => {
            return opts.map(opt => ({
                name: opt.textContent.trim(),
                value: opt.value
            })).filter(o => o.value && o.value !== '0' && o.name !== '--Select--');
        });

        return options;
    } catch (error) {
        console.error("Error fetching MUFG IPO list:", error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
};

export const checkMUFGStatus = async (ipoName, panNumbers) => {
    let browser = null;
    const results = { details: [] };

    try {
        console.log(`Launching browser for MUFG Check...`);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log(`Navigating to ${MUFG_URL}...`);
        await page.goto(MUFG_URL, { waitUntil: 'networkidle', timeout: 60000 });

        // Wait for key elements
        await page.waitForSelector(SEL_IPO_DROPDOWN, { state: 'visible', timeout: 30000 });

        // 1. Find Matching IPO
        const options = await page.$$eval(`${SEL_IPO_DROPDOWN} option`, (opts) => {
            return opts.map(opt => ({ name: opt.textContent.trim(), value: opt.value }));
        });

        let bestMatch = null;
        let highestScore = 0;

        for (const opt of options) {
            const score = getSimilarity(opt.name, ipoName);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = opt;
            }
        }

        if (!bestMatch || highestScore < 0.3) {
            console.error(`MUFG: IPO "${ipoName}" not found. Best match: "${bestMatch?.name}" (${highestScore})`);
            return { details: panNumbers.map(pan => ({ pan, status: 'UNKNOWN', message: 'IPO Not Found' })) };
        }

        console.log(`Selected IPO: ${bestMatch.name} (Value: ${bestMatch.value})`);

        // Select IPO
        await page.selectOption(SEL_IPO_DROPDOWN, bestMatch.value);

        // Explicitly click PAN radio
        console.log("Selecting PAN radio...");
        await page.waitForSelector(SEL_RADIO_PAN, { state: 'visible' });
        await page.click(SEL_RADIO_PAN);

        for (const pan of panNumbers) {
            try {
                const cleanPan = pan.toUpperCase();
                console.log(`Checking PAN: ${cleanPan}`);

                // Clear and Enter PAN
                await page.waitForSelector(SEL_INPUT, { state: 'visible' });
                await page.fill(SEL_INPUT, '');
                await page.fill(SEL_INPUT, cleanPan);

                // Check for CAPTCHA
                const captchaVisible = await page.isVisible('#input-section'); // Based on dump, class input-section is hidden
                if (captchaVisible) {
                    console.log("CAPTCHA detected! Cannot proceed automatically.");
                    results.details.push({ pan: cleanPan, status: 'UNKNOWN', message: 'CAPTCHA Detected' });
                    continue;
                }

                // Submit
                console.log("Submitting...");
                await page.click(SEL_SUBMIT);

                // Wait for either Result Grid or Dialog
                // Use Promise.race to wait for either
                const resultGrid = page.waitForSelector(SEL_RESULT_GRID, { state: 'visible', timeout: 10000 }).catch(() => null);
                const dialog = page.waitForSelector(SEL_RESULT_MODAL, { state: 'visible', timeout: 10000 }).catch(() => null);

                await Promise.race([resultGrid, dialog]);

                // Check Dialog First (Error/No Record)
                if (await page.isVisible(SEL_RESULT_MODAL)) {
                    const msg = await page.textContent(SEL_RESULT_MSG);
                    console.log(`Dialog Message: ${msg?.trim()}`);

                    // Close dialog
                    const closeBtn = await page.$('.ui-button');
                    if (closeBtn) await closeBtn.click();

                    let status = 'UNKNOWN';
                    if (msg && msg.toLowerCase().includes('no record found')) {
                        status = 'NOT_APPLIED';
                    }

                    results.details.push({ pan: cleanPan, status, message: msg?.trim() });
                }
                // Check Result Grid
                else if (await page.isVisible(SEL_RESULT_GRID)) {
                    console.log("Result Grid Visible.");
                    const html = await page.innerHTML(SEL_RESULT_GRID);
                    // Log HTML for debugging since we don't know exact structure yet
                    console.log("Grid HTML:", html.substring(0, 500));

                    const $ = cheerio.load(html);

                    // Simple text check for "Allotted"
                    const text = $.text();
                    let status = 'ALLOTTED'; // Assume allotted if grid shows up, usually implies success
                    let units = '0';

                    // Try to parse units
                    // Look for patterns like "Securities Allotted : 123"
                    // Since we don't have the table structure, let's use Regex on text
                    const allottedMatch = text.match(/Securities Allotted\s*[:\-]?\s*(\d+)/i);
                    if (allottedMatch) {
                        units = allottedMatch[1];
                        if (parseInt(units) === 0) status = 'NOT_APPLIED';
                    }

                    results.details.push({ pan: cleanPan, status, units, message: 'Check Successful' });
                } else {
                    console.log("No result grid or dialog appeared.");
                    results.details.push({ pan: cleanPan, status: 'UNKNOWN', message: 'Timeout' });
                }

            } catch (err) {
                console.error(`Error checking PAN ${pan}:`, err);
                results.details.push({ pan, status: 'ERROR', message: err.message });
            }
        }

    } catch (error) {
        console.error("MUFG Scraper Error:", error);
        if (browser) {
            const pages = browser.contexts()[0]?.pages();
            if (pages && pages.length > 0) {
                await pages[0].screenshot({ path: 'mufg_error.png', fullPage: true });
                console.log("Screenshot saved to mufg_error.png");
            }
        }
        results.details.push({ pan: 'SYSTEM', status: 'ERROR', message: error.message });
    } finally {
        if (browser) await browser.close();
    }

    return results;
};

// Helper to parse key-value pairs from simple tables if structured that way
const parseRowValue = ($, key) => {
    // Basic implementation: Find a cell with text 'key', get the next cell's text
    // MUFG tables are often standard <table> with <tr> <td>Label</td> <td>Value</td> </tr>
    // or sometimes <th>Label</th> <td>Value</td>

    // Attempt 1: Look for td with text
    let cell = $(`td:contains('${key}')`);
    if (cell.length > 0) {
        return cell.next('td').text().trim();
    }

    // Attempt 2: Look for th with text
    cell = $(`th:contains('${key}')`);
    if (cell.length > 0) {
        return cell.next('td').text().trim();
    }

    return "0";
};
