import axios from 'axios';

const getYear = () => new Date().getFullYear();
const getMonth = () => new Date().getMonth() + 1;
const getFinancialYear = () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    if (month >= 4) return `${year}-${(year + 1).toString().slice(-2)}`;
    return `${year - 1}-${year.toString().slice(-2)}`;
};

const MAINBOARD_URL_TEMPLATE = (month, year, fy) => `https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/${month}/${year}/${fy}/0/0/0?search=&v=21-21`;

const run = async () => {
    const url = MAINBOARD_URL_TEMPLATE(12, 2024, '2024-25'); // Using Dec 2024 to likely get data
    // Or simpler: current date
    const m = getMonth(); const y = getYear(); const fy = getFinancialYear();
    const currentUrl = MAINBOARD_URL_TEMPLATE(m, y, fy);

    console.log(`Fetching from: ${currentUrl}`);

    try {
        const { data } = await axios.get(currentUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (data && data.reportTableData && data.reportTableData.length > 0) {
            console.log('Fields available in first record:', Object.keys(data.reportTableData[0]));
            console.log('Sample Record:', JSON.stringify(data.reportTableData[0], null, 2));
        } else {
            console.log('No data found.');
        }
    } catch (e) {
        console.error(e.message);
    }
};

run();
