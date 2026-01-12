import express from 'express';
const smeRoute = express.Router();
import {
    createSMEIPO,
    getAllSMEIPOs,
    getSMEIPOById,
    updateSMEIPOById,
    deleteSMEIPOById,
    deleteSMEBulk,
    getSMEIPOForEdit,
    manualUpdateSMEIPO
} from '../controllers/sme.controller.js';
import { ipoCreateSchema, ipoUpdateSchema } from '../schema/mainboard.schema.js';
import { zodValidate } from '../middlewares/zod.middleware.js';

import upload from '../middlewares/multer.middleware.js';
import { parseJsonFields } from '../middlewares/jsonParser.middleware.js';

/**
 * @swagger
 * tags:
 *   name: SME IPOs
 *   description: API to manage SME IPOs
 */

/**
 * @swagger
 * /api/sme/sme-ipos:
 *   get:
 *     summary: Retrieve a list of SME IPOs
 *     tags: [SME IPOs]
 *     responses:
 *       200:
 *         description: A list of SME IPOs.
 */
smeRoute.get('/sme-ipos', getAllSMEIPOs);

/**
 * @swagger
 * /api/sme/sme-ipos:
 *   post:
 *     summary: Create a new SME IPO
 *     tags: [SME IPOs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *               data:
 *                 type: string
 *     responses:
 *       201:
 *         description: SME IPO created successfully.
 */
smeRoute.post('/sme-ipos', upload.single('icon'), parseJsonFields, zodValidate(ipoCreateSchema), createSMEIPO);

/**
 * @swagger
 * /api/sme/sme-ipo/{id}:
 *   get:
 *     summary: Get an SME IPO by ID
 *     tags: [SME IPOs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SME IPO details
 */
smeRoute.get('/sme-ipo/:id', getSMEIPOById);

/**
 * @swagger
 * /api/sme/edit/{id}:
 *   get:
 *     summary: Get SME IPO data for Manual Edit
 *     tags: [SME IPOs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SME IPO details for edit
 * */
smeRoute.get('/edit/:id', getSMEIPOForEdit);

/**
 * @swagger
 * /api/sme/edit/{id}:
 *   patch:
 *     summary: Manual Update of SME IPO
 *     tags: [SME IPOs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: SME IPO updated manually
 * */
smeRoute.patch("/edit/:id", upload.single('icon'), parseJsonFields, zodValidate(ipoUpdateSchema), manualUpdateSMEIPO);

/**
 * @swagger
 * /api/sme/sme-ipo/{id}:
 *   patch:
 *     summary: Update an SME IPO by ID
 *     tags: [SME IPOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: binary
 *               data:
 *                 type: string
 *     responses:
 *       200:
 *         description: SME IPO updated
 */
smeRoute.patch("/sme-ipo/:id", upload.single('icon'), parseJsonFields, zodValidate(ipoUpdateSchema), updateSMEIPOById);

/**
 * @swagger
 * /api/sme/sme-ipo/{id}:
 *   delete:
 *     summary: Delete an SME IPO by ID
 *     tags: [SME IPOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SME IPO deleted
 */
smeRoute.delete('/sme-ipo/:id', deleteSMEIPOById);

/**
 * @swagger
 * /api/sme/sme-ipos/bulk-delete:
 *   post:
 *     summary: Bulk delete SME IPOs
 *     tags: [SME IPOs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: IPOs deleted successfully
 */
smeRoute.post('/sme-ipos/bulk-delete', deleteSMEBulk);

export default smeRoute;
