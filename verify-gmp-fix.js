import { scrapeGMPFromIPOWatch } from './src/services/gmp-scraper.service.js';

async function verify() {
    console.log("Verifying GMP Fix...");

    try {
        const data = await scrapeGMPFromIPOWatch();
        console.log(`Scraped ${data.length} entries.`);

        // Find key IPOs
        const icici = data.find(d => d.companyName.includes('ICICI Prudential'));
        const gujarat = data.find(d => d.companyName.includes('Gujarat Kidney'));
        const shyam = data.find(d => d.companyName.includes('Shyam Dhani'));

        console.log("\nKey Results:");
        console.log("ICICI Prudential:", icici || "Not Found");
        console.log("Gujarat Kidney:", gujarat || "Not Found");
        console.log("Shyam Dhani:", shyam || "Not Found");

        // Validate
        if (icici && icici.gmp < 1000) {
            console.log("SUCCESS: ICICI GMP seems reasonable (e.g. < 1000). Previously mistaken for Price (2165).");
        } else if (icici) {
            console.log("WARNING: ICICI GMP is very high (" + icici.gmp + "). Possible error?");
        }

        if (gujarat && gujarat.gmp === 0) {
            console.log("SUCCESS: Gujarat Kidney GMP is 0 (matches current market).");
        }

    } catch (error) {
        console.error("Verification Error:", error);
    }
}

verify();
