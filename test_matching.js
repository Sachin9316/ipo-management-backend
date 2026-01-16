
const { getSimilarity, isSubsetMatch, getTokens } = require('./src/utils/matching.js');

const name1 = "Shadowfax Technologies Ltd.";
const name2 = "Shadowfax";

console.log("Tokens 1:", getTokens(name1));
console.log("Tokens 2:", getTokens(name2));

const score = getSimilarity(name1, name2);
console.log(`Similarity Score: ${score}`);

const subset = isSubsetMatch(name1, name2);
console.log(`Is Subset Match: ${subset}`);
