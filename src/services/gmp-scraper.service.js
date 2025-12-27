import axios from 'axios';
import * as cheerio from 'cheerio';
import Mainboard from '../models/mainboard.model.js';
import { isMatch, parseCurrency } from '../utils/matching.js';

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

        $('figure.wp-block-table table tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 2) {
                const companyName = $(cols[0]).text().trim();
                const gmpVal = parseCurrency($(cols[1]).text().trim());
                if (companyName) {
                    gmpData.push({ companyName, gmp: gmpVal, source: 'IPOWatch' });
                }
            }
        });
        return gmpData;
    } catch (error) {
        console.error('IPOWatch Scrape Error:', error.message);
        return [];
    }
};

export const syncAllGMPData = async () => {
    try {
        console.log('Starting Global GMP Sync...');

        const [chittorgarhData, investorgainData, ipowatchData] = await Promise.all([
            scrapeGMPFromChittorgarh(),
            scrapeGMPFromInvestorgain(),
            scrapeGMPFromIPOWatch()
        ]);

        const allGmp = [...chittorgarhData, ...investorgainData, ...ipowatchData];
        console.log(`Collected ${allGmp.length} GMP entries from all sources.`);

        // Group by company name (simple or aggregate?)
        // Let's take the highest GMP or average? Usually, they are similar or one is more updated.
        // Let's use a Map to aggregate
        const aggregatedGmp = new Map();

        allGmp.forEach(entry => {
            const existing = aggregatedGmp.get(entry.companyName);
            if (!existing || entry.gmp > existing.gmp) {
                aggregatedGmp.set(entry.companyName, entry);
            }
        });

        const activeIpos = await Mainboard.find({
            status: { $in: ['UPCOMING', 'OPEN', 'CLOSED'] }
        });

        console.log(`Processing ${activeIpos.length} active IPOs for GMP updates...`);

        let updatedCount = 0;
        for (const ipo of activeIpos) {
            let foundGmp = null;

            // Try to find a match in aggregated data
            for (const [name, data] of aggregatedGmp) {
                if (isMatch(ipo.companyName, name)) {
                    foundGmp = data.gmp;
                    break;
                }
            }

            if (foundGmp !== null) {
                const latestEntry = ipo.gmp && ipo.gmp.length > 0 ? ipo.gmp[ipo.gmp.length - 1] : null;

                // Only add if price changed or no gmp exists
                if (!latestEntry || latestEntry.price !== foundGmp) {
                    console.log(`Updating GMP for ${ipo.companyName}: ${latestEntry?.price || 0} -> ${foundGmp}`);
                    ipo.gmp.push({
                        price: foundGmp,
                        kostak: "0",
                        date: new Date()
                    });

                    // Keep gmp array size reasonable (e.g., last 30 entries)
                    if (ipo.gmp.length > 30) {
                        ipo.gmp.shift();
                    }

                    await ipo.save();
                    updatedCount++;
                }
            }
        }

        return {
            success: true,
            updatedCount,
            totalProcessed: activeIpos.length
        };
    } catch (error) {
        console.error('Global GMP Sync Error:', error);
        throw error;
    }
};
