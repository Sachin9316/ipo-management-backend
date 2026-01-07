
import { isMatch } from './src/utils/matching.js';

const mockKFintechList = [
    { clientId: "1", name: "GLOBAL OCEAN LOGISTICS INDIA LIMITED" },
    { clientId: "2", name: "MUTHOOT MERCANTILE LIMITED" },
    { clientId: "3", name: "TATA TECHNOLOGIES LIMITED" }, // Example
    { clientId: "4", name: "TATA MOTORS LIMITED" },       // Example
    { clientId: "5", name: "VISHNU PRAKASH R PUNGLIA LIMITED" }
];

const testCases = [
    "GLOBAL OCEAN",
    "Global Ocean Logistics",
    "Muthoot", // Might match multiple if not careful, but here okay
    "Tata",    // Should match both? or first one?
    "Vishnu Prakash",
    "Unrelated Company"
];

console.log("Testing isMatch logic...");

testCases.forEach(inputName => {
    console.log(`\nSearching for: "${inputName}"`);
    // Find all matches to see if it's too broad
    const matches = mockKFintechList.filter(item => isMatch(item.name, inputName));

    if (matches.length === 0) {
        console.log("  No match found.");
    } else if (matches.length === 1) {
        console.log(`  Match found: "${matches[0].name}"`);
    } else {
        console.log(`  MULTIPLE MATCHES FOUND (${matches.length}):`);
        matches.forEach(m => console.log(`    - "${m.name}"`));
    }

    // Simulate what the service does (find first)
    const firstMatch = mockKFintechList.find(item => isMatch(item.name, inputName));
    if (firstMatch) {
        console.log(`  Service selects: "${firstMatch.name}"`);
    }
});
