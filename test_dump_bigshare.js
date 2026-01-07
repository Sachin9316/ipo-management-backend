
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log("Navigating to Bigshare...");
        // Try the common URL
        await page.goto('https://www.bigshareonline.com/ipo_Allotment.html', { waitUntil: 'domcontentloaded' });

        // Wait a bit for scripts
        await page.waitForTimeout(5000);

        const content = await page.content();
        fs.writeFileSync('bigshare_dump.html', content);
        console.log("Dumped HTML to bigshare_dump.html");

        // Also take a screenshot to see what it looks like
        await page.screenshot({ path: 'bigshare_preview.png' });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
