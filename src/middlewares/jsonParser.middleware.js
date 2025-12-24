
export const parseJsonFields = (req, res, next) => {
    const jsonFields = ['subscription', 'gmp', 'financials', 'listing_info', 'dates']; // List of fields that might be sent as JSON strings

    try {
        if (req.body) {
            jsonFields.forEach(field => {
                if (req.body[field] && typeof req.body[field] === 'string') {
                    try {
                        req.body[field] = JSON.parse(req.body[field]);
                    } catch (e) {
                        console.warn(`Failed to parse JSON for field ${field}:`, e);
                        // Continue, let Zod catch validation errors if it's invalid
                    }
                }
            });
        }
        next();
    } catch (error) {
        console.error("JSON Parsing Middleware Error:", error);
        next();
    }
};
