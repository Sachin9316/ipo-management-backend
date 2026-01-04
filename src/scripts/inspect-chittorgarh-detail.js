import axios from 'axios';
import * as cheerio from 'cheerio';

// Example URL derived from API output
const URL = 'https://www.chittorgarh.com/ipo/gujarat-kidney-and-super-speciality-ipo/2289/';

const inspectDetail = async () => {
    try {
        console.log(`Fetching ${URL}...`);
        const { data } = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        // Helper to print table rows
        $('table tr').each((i, el) => {
            const tds = $(el).find('td');
            if (tds.length >= 2) {
                const label = $(tds[0]).text().trim();
                const value = $(tds[1]).text().trim();
                if (label.includes('Price') || label.includes('Listing') || label.includes('Registrar') || label.includes('Lot Size')) {
                    console.log(`Found: ${label} -> ${value}`);
                }
            }
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
};

inspectDetail();
