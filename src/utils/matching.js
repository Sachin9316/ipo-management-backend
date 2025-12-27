// Helper for fuzzy matching names
export const isMatch = (name1, name2) => {
    if (!name1 || !name2) return false;
    const clean = n => n.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n1 = clean(name1);
    const n2 = clean(name2);
    return n1.includes(n2) || n2.includes(n1);
};

// Helper: Clean currency strings (e.g., "₹ 12,000" -> 12000)
export const parseCurrency = (str) => {
    if (!str || str.toLowerCase().includes('-') || str.toLowerCase().includes('n/a')) return 0;
    // Extract numbers and decimal point
    const match = str.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
};
