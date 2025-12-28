import fs from 'fs';

const html = fs.readFileSync('investorgain_gmp.html', 'utf8');
const search = 'Gujarat Kidney';
let index = html.indexOf(search);

console.log(`Searching for "${search}"...`);

while (index !== -1) {
    console.log(`\n--- Found at index ${index} ---`);
    const start = Math.max(0, index - 200);
    const end = Math.min(html.length, index + 200);
    console.log(html.substring(start, end));
    index = html.indexOf(search, index + 1);
}
