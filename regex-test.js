
const inputs = [
    "365 to 384",
    "365 - 384",
    "365-384",
    "384 - 384",
    "384"
];

const oldRegex = /\s+(?:to|-)\s+/i;
const newRegex = /(?:\s+to\s+|\s*-\s*)/i;

console.log("Testing Old Regex:", oldRegex);
inputs.forEach(input => {
    const parts = input.split(oldRegex);
    console.log(`'${input}' ->`, parts);
});

console.log("\nTesting New Regex:", newRegex);
inputs.forEach(input => {
    const parts = input.split(newRegex);
    console.log(`'${input}' ->`, parts);
});
