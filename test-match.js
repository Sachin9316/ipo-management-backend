import { fetchChittorgarhAPIData } from './src/services/chittorgarh-list.service.js';
import slugify from 'slugify';
import { getSimilarity } from './src/utils/matching.js';

// Mock Data representing "Scraped" data from IPOWatch
const mockScrapedIPOs = [
    { companyName: "Armour Security India", slug: "armour-security-india-ipo" },
    { companyName: "Amagi Media Labs", slug: "amagi-media-labs-ipo" },
    { companyName: "Random IPO", slug: "random-ipo" }
];

async function testMatching() {
    console.log("Fetching API Data...");
    const apiDataList = await fetchChittorgarhAPIData();
    console.log(`API returned ${apiDataList.length} items.`);
    console.log("Sample API Names:");
    apiDataList.slice(0, 5).forEach(i => console.log(`"${i.companyName}"`));

    // Create Map
    const apiMap = new Map();
    apiDataList.forEach(item => apiMap.set(item.slug, item));

    mockScrapedIPOs.forEach(ipo => {
        console.log(`\nChecking IPO: ${ipo.companyName} (${ipo.slug})`);

        let apiMatch = apiMap.get(ipo.slug);

        if (!apiMatch) {
            console.log("  Slug match failed. Trying fuzzy...");
            let bestScore = 0;
            let bestName = "";
            for (const apiItem of apiDataList) {
                const score = getSimilarity(ipo.companyName, apiItem.companyName);
                if (score > bestScore) {
                    bestScore = score;
                    apiMatch = apiItem;
                    bestName = apiItem.companyName;
                }
            }
            console.log(`  Best Fuzzy Score: ${bestScore} with "${bestName}"`);
            if (bestScore < 0.3) apiMatch = null;
        } else {
            console.log("  Slug match SUCCESS!");
        }

        if (apiMatch) {
            console.log("  => MERGE WOULD HAPPEN with data:", apiMatch.companyName);
            console.log("     Dates:", apiMatch.open_date, "-", apiMatch.close_date);
            console.log("     Price:", apiMatch.min_price, "-", apiMatch.max_price);
        } else {
            console.log("  => NO MATCH FOUND.");
        }
    });
}

testMatching();
