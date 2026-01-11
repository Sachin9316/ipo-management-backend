import axios from 'axios';
import * as cheerio from 'cheerio';

const fetchRawList = async () => {
    // Hardcoded URL for testing (current year)
    const url = `https://webnodejs.chittorgarh.com/cloud/report/data-read/82/1/1/2026/2025-26/0/all/0?search=&v=16-05`;
    const prevUrl = `https://webnodejs.chittorgarh.com/cloud/report/data-read/82/1/1/2025/2025-26/0/all/0?search=&v=16-05`;

    try {
        const [r1, r2] = await Promise.all([
            axios.get(url),
            axios.get(prevUrl)
        ]);
        return [...r1.data.reportTableData, ...r2.data.reportTableData];
    } catch (e) {
        console.error(e.message);
        return [];
    }
};

const scrapeDetail = async (link) => {
    console.log(`Scraping: ${link}`);
    const { data } = await axios.get(link);
    const $ = cheerio.load(data);

    // Dump all table keys
    $('table tr').each((i, row) => {
        const cells = $(row).find('td, th');
        // Ensure there are at least two cells to avoid errors when accessing cells[0] and cells[1]
        if (cells.length >= 2) {
            const key = $(cells[0]).text().trim();
            const val = $(cells[1]).text().trim();
            console.log(`[TABLE ROW] "${key}" (len:${key.length}): "${val}"`);
        }
    });
};

const run = async () => {
    const list = await fetchRawList();
    const target = list.find(x => x['Company'] && x['Company'].includes('Modern Diagnostic'));

    if (target) {
        console.log('Found target:', target['Company']);
        // Construct link
        let id = target['~id'];
        if (!id) {
            const match = target['Company'].match(/\/(\d+)\//);
            if (match) id = match[1];
        }

        if (!id) {
            console.log('Could not extract ID');
            return;
        }

        const link = `https://www.chittorgarh.com/ipo/modern-diagnostic-ipo/${id}/`;
        await scrapeDetail(link);
    } else {
        console.log('Target not found');
    }
};

run();
