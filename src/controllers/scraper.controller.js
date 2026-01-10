import { scrapeIPOData, scrapeAndSaveIPOData, scrapeAndSaveMainboardIPOs, scrapeAndSaveSmeIPOs } from '../services/scraper.service.js';
import { syncAllGMPData } from '../services/gmp-scraper.service.js';

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

export const syncMainboardData = async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await scrapeAndSaveMainboardIPOs(limit ? parseInt(limit) : 10);
        res.status(200).json({
            success: true,
            message: `Mainboard Sync completed. Saved/Updated ${result.count} out of ${result.total} IPOs.`,
            details: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: `Mainboard Sync failed: ${error.message}` });
    }
};

export const syncSMEData = async (req, res) => {
    try {
        const { limit } = req.query;
        const result = await scrapeAndSaveSmeIPOs(limit ? parseInt(limit) : 10);
        res.status(200).json({
            success: true,
            message: `SME Sync completed. Saved/Updated ${result.count} out of ${result.total} IPOs.`,
            details: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: `SME Sync failed: ${error.message}` });
    }
};

export const syncGMPData = async (req, res) => {
    try {
        const result = await syncAllGMPData();
        res.status(200).json({
            success: true,
            message: `GMP sync completed. Updated ${result.updatedCount} IPOs.`,
            details: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `GMP Sync failed: ${error.message}`
        });
    }
};
