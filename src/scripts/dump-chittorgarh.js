import axios from 'axios';
import fs from 'fs';

const URL = 'https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/83/';

const dump = async () => {
    try {
        console.log(`Fetching ${URL}...`);
        const { data } = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        fs.writeFileSync('temp_chittorgarh.html', data);
        console.log('Dumped HTML to temp_chittorgarh.html');
    } catch (error) {
        console.error('Error:', error.message);
    }
};

dump();
