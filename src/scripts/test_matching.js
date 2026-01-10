import { isMatch, getSimilarity } from '../utils/matching.js';

const apiName = "Bharat Coking Coal Ltd.";
const dbNames = [
    "Bharat Coking Coal Limited",
    "Bharat Coking Coal Ltd",
    "Bharat Coking Coal Ltd. IPO",
    "Bharat Coking Coal Limited IPO"
];

console.log(`Testing match for API Name: "${apiName}"\n`);

dbNames.forEach(dbName => {
    const match = isMatch(apiName, dbName);
    const score = getSimilarity(apiName, dbName);
    console.log(`vs "${dbName}" -> Match: ${match}, Score: ${score.toFixed(2)}`);
});
