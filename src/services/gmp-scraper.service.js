import axios from 'axios';
import * as cheerio from 'cheerio';
import Mainboard from '../models/mainboard.model.js';
import { isMatch, parseCurrency, getSimilarity, isSubsetMatch } from '../utils/matching.js';
import { fetchInvestorGainGMP } from './investorgain.service.js';

const CHITTORGARH_GMP_URL = 'https://www.chittorgarh.com/report/ipo-grey-market-premium-gmp/218/';
const INVESTORGAIN_GMP_URL = 'https://www.investorgain.com/report/live-ipo-gmp/331/';
const IPOWATCH_GMP_URL = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

export const scrapeGMPFromChittorgarh = async () => {
    try {
        console.log('Scraping GMP from Chittorgarh...');
        const { data } = await axios.get(CHITTORGARH_GMP_URL, { headers: HEADERS });
        const $ = cheerio.load(data);
        const gmpData = [];

        $('.table tr').each((i, el) => {
            if (i === 0) return; // Skip header
            const cols = $(el).find('td');
            if (cols.length >= 2) {
                const companyName = $(cols[0]).text().trim();
                const gmpVal = parseCurrency($(cols[1]).text().trim());
                if (companyName) {
                    gmpData.push({ companyName, gmp: gmpVal, source: 'Chittorgarh' });
                }
            }
        });
        return gmpData;
    } catch (error) {
        console.error('Chittorgarh Scrape Error:', error.message);
        return [];
    }
};

export const scrapeGMPFromInvestorgain = async () => {
    try {
        console.log('Scraping GMP from Investorgain...');
        const { data } = await axios.get(INVESTORGAIN_GMP_URL, { headers: HEADERS });
        const $ = cheerio.load(data);
        const gmpData = [];

        $('.table tr').each((i, el) => {
            if (i === 0) return;
            const cols = $(el).find('td');
            if (cols.length >= 2) {
                const companyName = $(cols[0]).text().trim();
                const gmpVal = parseCurrency($(cols[2]).text().trim()); // Usually 3rd col
                if (companyName) {
                    gmpData.push({ companyName, gmp: gmpVal, source: 'Investorgain' });
                }
            }
        });
        return gmpData;
    } catch (error) {
        console.error('Investorgain Scrape Error:', error.message);
        return [];
    }
};

export const scrapeGMPFromIPOWatch = async () => {
    try {
        console.log('Scraping GMP from IPOWatch...');
        const { data } = await axios.get(IPOWATCH_GMP_URL, { headers: HEADERS });
        const $ = cheerio.load(data);
        const gmpData = [];

        // Iterate over tables instead of rows directly to handle different headers
        $('figure.wp-block-table table').each((tableIdx, table) => {
            let gmpIndex = -1;
            const rows = $(table).find('tr');
            if (rows.length === 0) return;

            // Find GMP column index from header (first row)
            const headerCols = $(rows[0]).find('td, th');
            headerCols.each((colIdx, col) => {
                const text = $(col).text().toLowerCase();
                if (text.includes('gmp') || text.includes('premium')) {
                    gmpIndex = colIdx;
                }
            });

            if (gmpIndex === -1 && rows.length > 1) {
                // Fallback: If header is not in first row (unlikely but possible), try guessing?
                // For now, if no header found, we skip to avoid bad data like Price being mistaken for GMP
                // Or check if it's the specific layout we know
                // Usually Table 1 (SME) has GMP at 1, Table 2 (Mainboard) has GMP at 2
                // We could use heuristics if dynamic check fails, but dynamic is safer.
                // console.warn(`No GMP header found in Table ${tableIdx}`);
                return;
            }

            rows.each((rowIdx, row) => {
                if (rowIdx === 0) return; // Skip header
                const cols = $(row).find('td');
                if (cols.length > gmpIndex) {
                    const companyName = $(cols[0]).text().trim();
                    const gmpVal = parseCurrency($(cols[gmpIndex]).text().trim());
                    if (companyName) {
                        gmpData.push({ companyName, gmp: gmpVal, source: 'IPOWatch' });
                    }
                }
            });
        });

        return gmpData;
    } catch (error) {
        console.error('IPOWatch Scrape Error:', error.message);
        return [];
    }
};

export const syncMainboardGMP = async () => {
    try {
        console.log('Fetching GMP data from InvestorGain API (New Endpoint)...');
        const ipoList = await fetchInvestorGainGMP();

        if (!ipoList || ipoList.length === 0) {
            console.error('No data returned from InvestorGain API');
            return 0;
        }

        console.log(`Fetched ${ipoList.length} GMP entries (Mainboard & SME).`);

        // only fetch MAINBOARD for this specific function?
        // existing logic was just MAINBOARD.
        const activeIpos = await Mainboard.find({
            ipoType: 'MAINBOARD',
            status: { $in: ['UPCOMING', 'OPEN'] }
        });

        console.log(`Found ${activeIpos.length} existing Mainboard IPOs to check for updates.`);

        let updatedCount = 0;

        for (const item of ipoList) {
            // New service returns normalized object: { companyName, price, ... }
            if (item.ipoType !== 'MAINBOARD') continue; // Enforce Mainboard only for this function

            const companyName = item.companyName;
            const gmpPrice = item.price; // Already parsed number

            // Find matching IPO in DB
            let bestMatch = null;

            // 1. Try Slug Match if possible (DB has slug, item has slug)
            for (const ipo of activeIpos) {
                if (ipo.slug === item.slug) {
                    bestMatch = ipo;
                    break;
                }
            }

            // 2. Fallback to Fuzzy Match
            if (!bestMatch) {
                let bestScore = 0;
                for (const ipo of activeIpos) {
                    const score = getSimilarity(ipo.companyName, companyName);
                    const isSubset = isSubsetMatch(ipo.companyName, companyName);

                    // Boost score if subset match found (very reliable)
                    const finalScore = isSubset ? 0.99 : score;

                    if (finalScore > 0.6 && finalScore > bestScore) {
                        bestScore = finalScore;
                        bestMatch = ipo;
                    }
                }
            }

            if (bestMatch) {
                const todayStr = new Date().toDateString();

                // Find if we already have an entry for today
                const existingEntryIndex = bestMatch.gmp.findIndex(entry =>
                    new Date(entry.date).toDateString() === todayStr
                );

                if (existingEntryIndex !== -1) {
                    const existingEntry = bestMatch.gmp[existingEntryIndex];
                    if (existingEntry.price !== gmpPrice) {
                        console.log(`Updating Today's GMP for ${bestMatch.companyName} (${todayStr}): ${existingEntry.price} -> ${gmpPrice}`);
                        existingEntry.price = gmpPrice;
                        existingEntry.date = new Date(); // Update timestamp to latest
                        await bestMatch.save();
                        updatedCount++;
                    } else {
                        console.log(`GMP unchanged for ${bestMatch.companyName} today.`);
                    }
                } else {
                    const latestEntry = bestMatch.gmp.length > 0 ? bestMatch.gmp[bestMatch.gmp.length - 1] : null;
                    const currentPrice = latestEntry ? latestEntry.price : 0;

                    if (gmpPrice !== currentPrice || !latestEntry) {
                        console.log(`Adding New GMP for ${bestMatch.companyName}: ${currentPrice} -> ${gmpPrice}`);
                        bestMatch.gmp = bestMatch.gmp || [];
                        bestMatch.gmp.push({
                            price: gmpPrice,
                            kostak: "0",
                            date: new Date()
                        });

                        if (bestMatch.gmp.length > 30) {
                            bestMatch.gmp.shift();
                        }

                        await bestMatch.save();
                        updatedCount++;
                    }
                }
            }
        }

        return updatedCount;

    } catch (error) {
        console.error('Mainboard GMP Sync Error:', error);
        return 0;
    }
};

export const syncAllGMPData = async () => {
    try {
        console.log('Starting Global GMP Sync...');

        // 1. Sync Mainboard GMP (API Based - specialized for old/current Mainboard IPOs)
        const mainboardUpdates = await syncMainboardGMP();

        // 2. Sync SME GMP (Scraper Based - using existing logic)
        // We only want to process SME IPOs here to avoid double-touching Mainboard or overriding API data with potentially stale scraper data
        const [chittorgarhData, ipowatchData] = await Promise.all([
            scrapeGMPFromChittorgarh(),
            scrapeGMPFromIPOWatch()
        ]);

        const allScrapedGmp = [...chittorgarhData, ...ipowatchData];

        // Filter for SME logic? 
        // Actually, the original syncAllGMPData logic was filtering DB for SME.
        // "ipoType: 'SME'" was in the find query.
        // So we can keep that logic for the scraped data.

        const aggregatedGmp = new Map();
        allScrapedGmp.forEach(entry => {
            const existing = aggregatedGmp.get(entry.companyName);
            if (!existing || entry.gmp > existing.gmp) {
                aggregatedGmp.set(entry.companyName, entry);
            }
        });

        const activeSmeIpos = await Mainboard.find({
            status: { $in: ['UPCOMING', 'OPEN'] },
            ipoType: 'SME'
        });

        console.log(`Processing ${activeSmeIpos.length} active SME IPOs for GMP updates...`);

        let smeUpdatedCount = 0;
        for (const ipo of activeSmeIpos) {
            let foundGmp = null;
            for (const [name, data] of aggregatedGmp) {
                if (isMatch(ipo.companyName, name)) {
                    foundGmp = data.gmp;
                    break;
                }
            }

            if (foundGmp !== null) {
                const todayStr = new Date().toDateString();
                const existingEntryIndex = ipo.gmp.findIndex(entry =>
                    new Date(entry.date).toDateString() === todayStr
                );

                if (existingEntryIndex !== -1) {
                    const existingEntry = ipo.gmp[existingEntryIndex];
                    if (existingEntry.price !== foundGmp) {
                        existingEntry.price = foundGmp;
                        existingEntry.date = new Date();
                        await ipo.save();
                        smeUpdatedCount++;
                    }
                } else {
                    const latestEntry = ipo.gmp.length > 0 ? ipo.gmp[ipo.gmp.length - 1] : null;
                    if (!latestEntry || latestEntry.price !== foundGmp) {
                        ipo.gmp.push({
                            price: foundGmp,
                            kostak: "0",
                            date: new Date()
                        });
                        if (ipo.gmp.length > 30) ipo.gmp.shift();
                        await ipo.save();
                        smeUpdatedCount++;
                    }
                }
            }
        }

        return {
            success: true,
            updatedCount: mainboardUpdates + smeUpdatedCount,
            totalProcessed: activeSmeIpos.length // This metric is a bit skewed now but fine
        };
    } catch (error) {
        console.error('Global GMP Sync Error:', error);
        throw error;
    }
};
