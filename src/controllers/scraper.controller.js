import { scrapeIPOData, scrapeAndSaveIPOData } from '../services/scraper.service.js';

export const previewScrapedData = async (req, res) => {
    try {
        const { limit } = req.query; // Allow checking just 1 or 2 items
        const data = await scrapeIPOData(limit ? parseInt(limit) : 3);

        res.status(200).json({
            success: true,
            count: data.length,
            message: "Preview of scraped data. NO data has been saved to DB.",
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const syncScrapedData = async (req, res) => {
    try {
        const { limit } = req.query; // Optional limit
        const result = await scrapeAndSaveIPOData(limit ? parseInt(limit) : 10);

        res.status(200).json({
            success: true,
            message: `Scraping completed. Saved/Updated ${result.count} out of ${result.total} IPOs.`,
            details: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Sync failed: ${error.message}`
        });
    }
};
