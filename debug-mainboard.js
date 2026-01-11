import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeChittorgarhDetail } from './src/services/chittorgarh-list.service.js';

const run = async () => {
    // 1. Fetch List to find the target URL
    // These IPOs are from Dec 2025, so we need to check the 2025 list (Report 82)
    // URL for 2025 list
    const url = `https://webnodejs.chittorgarh.com/cloud/report/data-read/82/1/1/2025/2025-26/0/all/0?search=&v=16-05`;

    try {
        const { data } = await axios.get(url);
        const list = data.reportTableData || [];

        // Find Nephrocare
        const target = list.find(x => x['Company'] && (x['Company'].includes('Nephrocare') || x['Company'].includes('Wakefit')));

        if (target) {
            console.log('Found target:', target['Company']);

            // Construct Link
            let id = target['~id'];
            if (!id) {
                const match = target['Company'].match(/\/(\d+)\//);
                if (match) id = match[1];
            }
            if (!id) { console.log("No ID found"); return; }

            const link = `https://www.chittorgarh.com/ipo/${target['~URLRewrite_Folder_Name']}/${id}/`;
            console.log(`Scraping Detail Page: ${link}`);

            // Run existing extraction logic
            const detail = await scrapeChittorgarhDetail(target);
            console.log("Extracted Detail:", detail);

            // Perform manual inspection of the HTML for Logo
            console.log("--- Manual HTML Inspection for Logo & Listing ---");
            const { data: html } = await axios.get(link);
            const $ = cheerio.load(html);

            // Dump Images
            console.log("Images found:");
            $('img').each((i, el) => {
                const src = $(el).attr('src');
                const alt = $(el).attr('alt');
                const parentClass = $(el).parent().attr('class');
                // Filter out common UI elements
                if (src && !src.includes('pixel') && !src.includes('facebook') && !src.includes('twitter')) {
                    console.log(`Img: src="${src}" alt="${alt}" parent="${parentClass}"`);
                }
            });

            // Dump Table Keys for Listing
            console.log("Table Keys for Listing:");
            $('table tr').each((i, row) => {
                const cells = $(row).find('td, th');
                if (cells.length >= 2) {
                    const key = $(cells[0]).text().trim();
                    const val = $(cells[1]).text().trim();
                    if (key.match(/open|close|high|low|listing/i)) {
                        console.log(`[KEY] ${key}: ${val}`);
                    }
                }
            });

        } else {
            console.log('Target "Nephrocare" or "Wakefit" not found in 2025 list.');
        }

    } catch (e) {
        console.error(e);
    }
};

run();
