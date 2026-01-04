import AllotmentScraperService from '../services/allotment-scraper.service.js';

const test = async () => {
    console.log("Starting Scraper Test...");

    // Safe Test Cases (Use a very old IPO or invalid one to test Not Found logic)
    // PAN: Invalid PAN to force Not Found/Invalid
    const dummyPan = 'ABCDE1234F';
    const dummyIPO = 'TATA TECHNOLOGIES LIMITED'; // Past IPO

    // 1. KFintech Test
    console.log("\n--- Testing KFintech ---");
    const kfinResults = await AllotmentScraperService.checkAllotmentBatch('KFINTECH', dummyIPO, [dummyPan]);
    console.log("KFintech Results:", kfinResults);

    // 2. Link Intime Test
    console.log("\n--- Testing Link Intime ---");
    // Link Intime might look for exact names.
    const liResults = await AllotmentScraperService.checkAllotmentBatch('LINK_INTIME', dummyIPO, [dummyPan]);
    console.log("Link Intime Results:", liResults);

    // 3. Bigshare Test
    console.log("\n--- Testing Bigshare ---");
    // const bsResults = await AllotmentScraperService.checkAllotmentBatch('BIGSHARE', 'Some IPO', [dummyPan]);
    // console.log("Bigshare Results:", bsResults);

    console.log("\nTest Completed.");
    process.exit(0);
};

test();
