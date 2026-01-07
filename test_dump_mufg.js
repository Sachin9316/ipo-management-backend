
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://in.mpms.mufg.com/Initial_Offer/public-issues.html', { waitUntil: 'networkidle' });
        const content = await page.content();
        fs.writeFileSync('mufg_dump.html', content);
        console.log("Dumped HTML to mufg_dump.html");
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
