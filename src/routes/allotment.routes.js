
import express from 'express';
import { checkAllotment } from '../controllers/allotment.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/allotment/check:
 *   post:
 *     summary: Check IPO Allotment Status
 *     tags: [Allotment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ipoName:
 *                 type: string
 *               registrar:
 *                 type: string
 *               panNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Allotment Status
 */
router.post('/check', checkAllotment);

export default router;
