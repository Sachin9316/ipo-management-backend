import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const LIST_URL = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

async function fetchPage() {
    try {
        console.log(`Fetching List ${LIST_URL}...`);
        const { data: listData } = await axios.get(LIST_URL, { headers: HEADERS });
        const $ = cheerio.load(listData);

        let targetLink = null;
        $('table tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length > 0) {
                const name = $(cols[0]).text().trim();
                if (name.includes("ICICI Prudential")) {
                    targetLink = $(cols[0]).find('a').attr('href');
                }
            }
        });

        if (targetLink) {
            console.log(`Found Link: ${targetLink}`);
            console.log(`Fetching Detail Page...`);
            const { data: detailData } = await axios.get(targetLink, { headers: HEADERS });
            fs.writeFileSync('icici_details.html', detailData);
            console.log("Saved to icici_details.html");
        } else {
            console.log("Link not found in list.");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

fetchPage();
