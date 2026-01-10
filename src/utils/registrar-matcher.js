import { getSimilarity } from './matching.js';

/**
 * Finds the best matching registrar from a list of database registrars.
 * @param {string} scrapedName - The name scraped from the website.
 * @param {Array} dbRegistrars - Array of Registrar documents from DB.
 * @returns {Object|null} - The matched Registrar object or null if no match found.
 */
export const matchRegistrar = (scrapedName, dbRegistrars) => {
    if (!scrapedName || !dbRegistrars || dbRegistrars.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;
    const THRESHOLD = 0.3; // Using same threshold as matching.js

    // Clean the scraped name for better matching
    const clean = (s) => s.toLowerCase()
        .replace(/\(india\)/g, '')
        .replace(/pvt|ltd|limited|private|services|securities|financial/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const cleanScraped = clean(scrapedName);

    for (const reg of dbRegistrars) {
        const cleanDb = clean(reg.name);

        // 1. Direct includes check
        if (cleanDb.includes(cleanScraped) || cleanScraped.includes(cleanDb)) {
            // Prefer the one that is closer in length if multiple matches
            const score = 0.8 + (1 - Math.abs(cleanDb.length - cleanScraped.length) / Math.max(cleanDb.length, cleanScraped.length));
            if (score > bestScore) {
                bestScore = score;
                bestMatch = reg;
            }
            continue;
        }

        // 2. Jaccard Similarity
        const score = getSimilarity(scrapedName, reg.name);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = reg;
        }
    }

    if (bestScore > THRESHOLD) {
        return bestMatch;
    }

    return null;
};
