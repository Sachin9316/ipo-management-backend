import express from 'express';
import { previewScrapedData, syncScrapedData, syncGMPData } from '../controllers/scraper.controller.js';
import { protect, admin } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/scraper/preview:
 *   get:
 *     summary: Preview scraped IPO data (Admin only)
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of IPOs to scrape (default 3)
 *     responses:
 *       200:
 *         description: JSON preview of mapped data
 */
router.get('/preview', protect, admin, previewScrapedData);

/**
 * @swagger
 * /api/scraper/sync:
 *   post:
 *     summary: Scrape and save IPO data to DB (Admin only)
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of IPOs to process (default 10)
 *     responses:
 *       200:
 *         description: Sync completed successfully
 */
router.post('/sync', protect, admin, syncScrapedData);

/**
 * @swagger
 * /api/scraper/sync-gmp:
 *   post:
 *     summary: Scrape and update GMP data (Admin only)
 *     tags: [Scraper]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GMP sync completed successfully
 */
router.post('/sync-gmp', protect, admin, syncGMPData);

export default router;
