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

// Helper: Parse Issue Size (e.g., "Approx ₹42.60 Crores" -> "42.60")
export const parseIssueSize = (str) => {
    if (!str) return "0.00";
    const match = str.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    if (match && match[1]) {
        return parseFloat(match[1]).toFixed(2);
    }
    return "0.00";
};

export const roundToTwo = (num) => {
    if (typeof num === 'string') num = parseFloat(num);
    if (isNaN(num)) return 0;
    return Math.round(num * 100) / 100;
};
