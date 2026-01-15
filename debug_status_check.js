
// Mock the calculateStatus function exactly as it is in scraper.service.js
const calculateStatus = (open, close, listing) => {
    // 1. Get current time in IST
    const nowTemp = new Date();
    const utcTime = nowTemp.getTime() + (nowTemp.getTimezoneOffset() * 60000);
    // IST is UTC + 5.5 hours (+330 minutes)
    const nowIST = new Date(utcTime + (330 * 60000));

    console.log(`Current Calculated IST Time: ${nowIST.toISOString()}`);
    console.log(`Current IST Hour: ${nowIST.getHours()}`);

    // 2. Normalize Input Dates
    const openDate = open ? new Date(open) : null;
    const closeDate = close ? new Date(close) : null;
    const listingDate = listing ? new Date(listing) : null;

    if (openDate) openDate.setHours(0, 0, 0, 0);
    if (closeDate) closeDate.setHours(0, 0, 0, 0);
    if (listingDate) listingDate.setHours(0, 0, 0, 0);

    console.log(`Open Date: ${openDate ? openDate.toISOString() : 'null'}`);
    console.log(`Close Date: ${closeDate ? closeDate.toISOString() : 'null'}`);

    // 3. Logic
    if (listingDate && nowIST >= listingDate) return "LISTED";

    // OPEN CHECK
    if (openDate && nowIST >= openDate) {
        if (!closeDate) return "OPEN";

        const todayIST = new Date(nowIST);
        todayIST.setHours(0, 0, 0, 0);

        console.log(`Today IST (Start of Day): ${todayIST.toISOString()}`);
        console.log(`Comparing Today IST vs Close Date: ${todayIST.getTime()} vs ${closeDate.getTime()}`);

        if (todayIST < closeDate) {
            return "OPEN";
        } else if (todayIST.getTime() === closeDate.getTime()) {
            const currentHour = nowIST.getHours();
            console.log(`On Closing Date. Current Hour: ${currentHour}. Cutoff: 17`);
            if (currentHour < 17) {
                return "OPEN";
            } else {
                return "CLOSED";
            }
        } else {
            return "CLOSED";
        }
    }

    if (openDate && nowIST < openDate) return "UPCOMING";

    return "CLOSED";
};

// Test Cases
const test = () => {
    const todayStr = "2026-01-13"; // Using the date from the user screenshot
    const tomorrowStr = "2026-01-14";

    // Test 1: Bharat Coking Coal (Open Jan 9, Close Jan 13)
    console.log("\n--- TEST CASE 1: Bharat Coking Coal (Close Today) ---");
    const status1 = calculateStatus("2026-01-09", "2026-01-13", null);
    console.log(`Result: ${status1}`);
};

test();
