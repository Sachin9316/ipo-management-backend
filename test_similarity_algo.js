
function getTokens(str) {
    if (!str) return [];
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // remove special chars
        .split(/\s+/)
        .filter(t => t.length > 0 && !["limited", "ltd", "private", "pvt", "india"].includes(t));
}

function getSimilarity(name1, name2) {
    const tokens1 = new Set(getTokens(name1));
    const tokens2 = new Set(getTokens(name2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
}

const dbName = "Vishnu Prakash";
const candidates = [
    "Global Ocean Logistics Limited",
    "Vishnu Prakash R Punglia Limited",
    "Vishnu Chemicals",
    "Prakash Industries"
];

console.log(`Matching DB Name: "${dbName}"`);
candidates.forEach(cand => {
    console.log(`  vs "${cand}": ${getSimilarity(dbName, cand).toFixed(2)}`);
});

const dbName2 = "Tata";
const candidates2 = ["Tata Technologies", "Tata Motors", "Tata Steel"];
console.log(`\nMatching DB Name: "${dbName2}"`);
candidates2.forEach(cand => {
    console.log(`  vs "${cand}": ${getSimilarity(dbName2, cand).toFixed(2)}`);
});
