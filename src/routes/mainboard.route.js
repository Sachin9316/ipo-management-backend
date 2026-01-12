import express from 'express';
const mainboardRoute = express.Router();
import {
    createMainboard,
    getAllMainboards,
    getMainboardById,
    updateMainboardById,
    deleteMainboardById,
    deleteMainboardBulk,
    getMainboardForEdit,
    manualUpdateMainboard
} from '../controllers/mainboard.controller.js';
import { ipoCreateSchema, ipoUpdateSchema } from '../schema/mainboard.schema.js';
import { zodValidate } from '../middlewares/zod.middleware.js';

import upload from '../middlewares/multer.middleware.js';
import { parseJsonFields } from '../middlewares/jsonParser.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Mainboard IPOs
 *   description: API to manage Mainboard IPOs
 */

/**
 * @swagger
 * /api/mainboard/mainboards:
 *   get:
 *     summary: Retrieve a list of Mainboard IPOs
 *     tags: [Mainboard IPOs]
 *     responses:
 *       200:
 *         description: A list of Mainboard IPOs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mainboard'
 */
mainboardRoute.get('/mainboards', getAllMainboards);

/**
 * @swagger
 * /api/mainboard/mainboards:
 *   post:
 *     summary: Create a new Mainboard IPO
 *     tags: [Mainboard IPOs]
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
 *                 description: JSON string of IPO details
 *     responses:
 *       201:
 *         description: Mainboard IPO created successfully.
 */
mainboardRoute.post('/mainboards', upload.single('icon'), parseJsonFields, zodValidate(ipoCreateSchema), createMainboard);
/**
 * @swagger
 * /api/mainboard/mainboard/{id}:
 *   get:
 *     summary: Get a Mainboard IPO by ID
 *     tags: [Mainboard IPOs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The IPO ID
 *     responses:
 *       200:
 *         description: The Mainboard IPO description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mainboard'
 *       404:
 *         description: The IPO was not found
 */
mainboardRoute.get('/mainboard/:id', getMainboardById);

/**
 * @swagger
 * /api/mainboard/edit/{id}:
 *   get:
 *     summary: Get Mainboard IPO data for Manual Edit
 *     tags: [Mainboard IPOs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: IPO data for editing
 * */
mainboardRoute.get('/edit/:id', getMainboardForEdit);

/**
 * @swagger
 * /api/mainboard/edit/{id}:
 *   patch:
 *     summary: Manual Update of Mainboard IPO
 *     tags: [Mainboard IPOs]
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
 *         description: IPO updated manually
 * */
mainboardRoute.patch("/edit/:id", upload.single('icon'), parseJsonFields, zodValidate(ipoUpdateSchema), manualUpdateMainboard);

/**
 * @swagger
 * /api/mainboard/mainboard/{id}:
 *   patch:
 *     summary: Update a Mainboard IPO by ID
 *     tags: [Mainboard IPOs]
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
 *         description: The Mainboard IPO was updated
 *       404:
 *         description: The IPO was not found
 */
mainboardRoute.patch("/mainboard/:id", upload.single('icon'), parseJsonFields, zodValidate(ipoUpdateSchema), updateMainboardById);

/**
 * @swagger
 * /api/mainboard/mainboard/{id}:
 *   delete:
 *     summary: Remove the Mainboard IPO by ID
 *     tags: [Mainboard IPOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The IPO ID
 *     responses:
 *       200:
 *         description: The Mainboard IPO was deleted
 *       404:
 *         description: The IPO was not found
 */
mainboardRoute.delete('/mainboard/:id', deleteMainboardById);

/**
 * @swagger
 * /api/mainboard/mainboards/bulk-delete:
 *   post:
 *     summary: Bulk delete Mainboard IPOs
 *     tags: [Mainboard IPOs]
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
mainboardRoute.post('/mainboards/bulk-delete', deleteMainboardBulk);

export default mainboardRoute;