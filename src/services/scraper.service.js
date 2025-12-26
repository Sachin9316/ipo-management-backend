import puppeteer from 'puppeteer';

export const checkAllotmentStatus = async (registrarName, pan) => {
    if (!registrarName || !pan) {
        throw new Error("Registrar Name and PAN are required.");
    }

    const name = registrarName.toLowerCase();

    if (name.includes('link') || name.includes('intime')) {
        return await checkLinkIntime(pan);
    } else if (name.includes('kfin') || name.includes('tech')) {
        return await checkKFintech(pan);
    } else if (name.includes('bigshare')) {
        return await checkBigshare(pan);
    } else {
        return {
            status: "UNSUPPORTED_REGISTRAR",
            message: `Scraping not yet implemented for ${registrarName}`
        };
    }
};

const checkLinkIntime = async (pan) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Real navigation - waiting for network to settle to avoid race conditions/redirects
        await page.goto('https://linkintime.co.in/initial_offer/public-issues.html', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Small explicit wait to ensure any client-side redirects finish
        await new Promise(r => setTimeout(r, 2000));

        const title = await page.title();

        return {
            status: "CONNECTED",
            message: "Successfully reached Link Intime website.",
            pageTitle: title,
        };

    } catch (error) {
        console.error("LinkIntime Scraper Error:", error);
        throw new Error("Failed to scrape Link Intime: " + error.message);
    } finally {
        if (browser) await browser.close();
    }
};

const checkKFintech = async (pan) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // KFintech URL
        await page.goto('https://ris.kfintech.com/ipostatus/', { waitUntil: 'networkidle2' });

        return {
            status: "PENDING_IMPLEMENTATION",
            message: "KFintech scraper requires CAPTCHA solving integration."
        };

    } catch (error) {
        console.error("KFintech Scraper Error:", error);
        throw new Error("Failed to scrape KFintech: " + error.message);
    } finally {
        if (browser) await browser.close();
    }
};

const checkBigshare = async (pan) => {
    return {
        status: "PENDING_IMPLEMENTATION",
        message: "Bigshare scraper logic not yet implemented."
    };
};
