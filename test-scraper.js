import { fetchChittorgarhAPIData, scrapeChittorgarhIPOs } from './src/services/chittorgarh-list.service.js';

// Mock dependencies if needed, or just let it run if it's standalone
const run = async () => {
    try {
        console.log("Starting full scrape test...");
        // Scrape ALL with limit 20 to catch the recent SME IPOs
        const ipos = await scrapeChittorgarhIPOs(20, 'ALL');

        // Filter for "Modern Diagnostic"
        const target = ipos.find(i => i.companyName.includes('Modern Diagnostic'));

        if (target) {
            console.log("Target Found:", target.companyName);
            console.log("Lot Size:", target.lot_size);
            console.log("Lot Price:", target.lot_price);
            console.log("Listing Info:", target.listing_info);
            console.log("Listing Gain:", target.listing_info?.listing_gain);
        } else {
            console.log("Target NOT found in top 20.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
};

run();
