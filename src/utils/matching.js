// Helper for fuzzy matching names
export const isMatch = (name1, name2) => {
    if (!name1 || !name2) return false;
    // Use the new similarity check for "isMatch" as well, with a low threshold
    return getSimilarity(name1, name2) > 0.3;
};

/**
 * Tokenize string: lowercase, remove special chars, remove stopwords
 */
export const getTokens = (str) => {
    if (!str) return [];
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // remove special chars
        .split(/\s+/)
        .filter(t => t.length > 0 && !["limited", "ltd", "private", "pvt", "india", "company", "ipo", "ct", "o"].includes(t));
};

/**
 * Calculate Jaccard Similarity between two strings.
 * Returns score between 0 and 1.
 */
export const getSimilarity = (name1, name2) => {
    const tokens1 = new Set(getTokens(name1));
    const tokens2 = new Set(getTokens(name2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
};

export const isSubsetMatch = (name1, name2) => {
    const t1 = getTokens(name1);
    const t2 = getTokens(name2);
    if (t1.length === 0 || t2.length === 0) return false;

    const s1 = new Set(t1);
    const s2 = new Set(t2);

    // Check if s1 is subset of s2
    const isS1Subset = t1.every(token => s2.has(token));
    // Check if s2 is subset of s1
    const isS2Subset = t2.every(token => s1.has(token));

    return isS1Subset || isS2Subset;
};

// Helper: Clean currency strings (e.g., "₹ 12,000" -> 12000)
export const parseCurrency = (str) => {
    if (!str || str.toLowerCase().includes('n/a')) return 0;
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
