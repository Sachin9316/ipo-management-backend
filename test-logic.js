function testLogic() {
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 2);

    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 2);

    const ipoPast = {
        companyName: "Past IPO",
        allotment_date: pastDate,
        isAllotmentOut: false
    };

    const ipoFuture = {
        companyName: "Future IPO",
        allotment_date: futureDate,
        isAllotmentOut: false
    };

    const runLogic = (ipo, existingIPO) => {
        // Corrected logic:
        if (new Date(ipo.allotment_date).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0)) {
            ipo.isAllotmentOut = true;
        }
        if (existingIPO && existingIPO.isAllotmentOut) {
            ipo.isAllotmentOut = true;
        }
    };

    console.log("Testing Past IPO...");
    runLogic(ipoPast, null);
    console.log("ipoPast.isAllotmentOut:", ipoPast.isAllotmentOut); // Expected true

    console.log("Testing Future IPO...");
    runLogic(ipoFuture, null);
    console.log("ipoFuture.isAllotmentOut:", ipoFuture.isAllotmentOut); // Expected false

    console.log("Testing Future IPO with existing TRUE in DB...");
    const existing = { isAllotmentOut: true };
    runLogic(ipoFuture, existing);
    console.log("ipoFuture.isAllotmentOut:", ipoFuture.isAllotmentOut); // Expected true
}

testLogic();
