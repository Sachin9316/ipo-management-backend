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

const inspect = async () => {
    // Hardcoded for Dec 2025 to ensure data
    const month = 12;
    const year = 2025;
    const fy = "2025-26";
    const url = MAINBOARD_URL_TEMPLATE(month, year, fy);

    console.log(`Fetching: ${url}`);
    try {
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (data && data.reportTableData && data.reportTableData.length > 0) {
            console.log("Available Keys on first item:");
            console.log(Object.keys(data.reportTableData[0]));

            console.log("\nSample Data:");
            console.log(data.reportTableData[0]);
        } else {
            console.log("No data found");
        }
    } catch (e) {
        console.error(e);
    }
}

inspect();
