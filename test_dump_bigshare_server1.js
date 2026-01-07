
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log("Navigating to Bigshare Server 1...");
        // Navigate to the actual status page
        await page.goto('https://ipo.bigshareonline.com/ipo_status.html', { waitUntil: 'networkidle' });

        // Wait for potential dynamic content
        await page.waitForTimeout(5000);

        const content = await page.content();
        fs.writeFileSync('bigshare_server1_dump.html', content);
        console.log("Dumped HTML to bigshare_server1_dump.html");

        await page.screenshot({ path: 'bigshare_server1.png' });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
