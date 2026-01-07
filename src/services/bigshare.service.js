import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { getSimilarity } from '../utils/matching.js';

const BIGSHARE_URL = 'https://ipo.bigshareonline.com/ipo_status.html';

const SEL_COMPANY = 'select#ddlCompany';
const SEL_TYPE = 'select#SelectionType';
const SEL_PAN = 'input#txtpan';
const SEL_CAPTCHA_INPUT = 'input#captcha-input';
const SEL_SEARCH_BTN = 'button#btn_Search';
const SEL_RESULT_TABLE = '#dPrint';
const SEL_ERROR_MODAL = '.sweet-alert'; // SweetAlert class

export const checkBigshareStatus = async (ipoName, panNumbers) => {
    let browser = null;
    const results = { details: [] };

    try {
        console.log(`Launching browser for Bigshare Check...`);
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log(`Navigating to ${BIGSHARE_URL}...`);
        await page.goto(BIGSHARE_URL, { waitUntil: 'networkidle', timeout: 60000 });

        // 1. Select Company (Fuzzy Match)
        await page.waitForSelector(SEL_COMPANY, { state: 'visible' });

        const options = await page.$$eval(`${SEL_COMPANY} option`, (opts) => {
            return opts.map(opt => ({ name: opt.textContent.trim(), value: opt.value }))
                .filter(o => o.value !== '--Select Company--');
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
            console.error(`Bigshare: IPO "${ipoName}" not found. Best match: "${bestMatch?.name}" (${highestScore})`);
            return { details: panNumbers.map(pan => ({ pan, status: 'UNKNOWN', message: 'IPO Not Found' })) };
        }

        console.log(`Selected IPO: ${bestMatch.name} (Value: ${bestMatch.value})`);
        await page.selectOption(SEL_COMPANY, bestMatch.value);

        // 2. Select Selection Type -> PAN
        await page.selectOption(SEL_TYPE, 'PN');

        // Wait for PAN input to become visible (it's hidden initially)
        await page.waitForSelector(SEL_PAN, { state: 'visible' });

        for (const pan of panNumbers) {
            const cleanPan = pan.toUpperCase();
            console.log(`Checking PAN: ${cleanPan}`);

            try {
                // Clear and Enter PAN
                await page.fill(SEL_PAN, '');
                await page.fill(SEL_PAN, cleanPan);

                // 3. CAPTCHA BYPASS
                // The captcha code is stored in sessionStorage 'captchaCode'!
                const captchaCode = await page.evaluate(() => sessionStorage.getItem('captchaCode'));
                if (!captchaCode) {
                    throw new Error("Could not retrieve captcha code from sessionStorage");
                }
                console.log(`Bypassed Captcha: ${captchaCode}`);
                await page.fill(SEL_CAPTCHA_INPUT, captchaCode);

                // 4. Click Search
                await page.click(SEL_SEARCH_BTN);

                // 5. Wait for Result
                // Either #dPrint becomes visible, or .sweet-alert appears
                const resultTable = page.waitForSelector(SEL_RESULT_TABLE, { state: 'visible', timeout: 10000 }).catch(() => null);
                const errorModal = page.waitForSelector(SEL_ERROR_MODAL, { state: 'visible', timeout: 10000 }).catch(() => null);

                await Promise.race([resultTable, errorModal]);

                if (await page.isVisible(SEL_ERROR_MODAL)) {
                    // Check text in sweet alert
                    const errorText = await page.textContent('.sweet-alert p'); // usually text is in p
                    const errorTitle = await page.textContent('.sweet-alert h2');
                    const fullMsg = `${errorTitle} ${errorText}`.trim();
                    console.log(`SweetAlert: ${fullMsg}`);

                    // Close it? not strictly needed if we just loop, but good practice
                    // usually there is a confirm button
                    const okBtn = await page.$('.sweet-alert button.confirm');
                    if (okBtn) await okBtn.click();

                    if (fullMsg.includes("No Record Found")) {
                        results.details.push({ pan: cleanPan, status: 'NOT_APPLIED', message: "No Record Found" });
                    } else {
                        results.details.push({ pan: cleanPan, status: 'UNKNOWN', message: fullMsg });
                    }

                } else if (await page.isVisible(SEL_RESULT_TABLE)) {
                    console.log("Result Table Found.");

                    // Parse fields
                    const name = await page.textContent('#lbl3');
                    const applied = await page.textContent('#lbl4');
                    const allotted = await page.textContent('#lbl5');

                    let status = 'ALLOTTED';
                    let units = allotted ? parseInt(allotted) : 0;
                    if (units === 0) status = 'NOT_ALLOTTED';

                    results.details.push({
                        pan: cleanPan,
                        status,
                        units: units.toString(),
                        message: 'Result Found',
                        name: name?.trim()
                    });

                } else {
                    console.log("Timeout waiting for result.");
                    results.details.push({ pan: cleanPan, status: 'UNKNOWN', message: 'Timeout' });
                }

            } catch (err) {
                console.error(`Error checking PAN ${pan}:`, err);
                results.details.push({ pan: cleanPan, status: 'ERROR', message: err.message });
            }
        }

    } catch (error) {
        console.error("Bigshare Scraper Error:", error);
        results.details.push({ pan: 'SYSTEM', status: 'ERROR', message: error.message });
    } finally {
        if (browser) await browser.close();
    }

    return results;
};
