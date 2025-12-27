import express from 'express';
const router = express.Router();
import {
    createRegistrar,
    getAllRegistrars,
    getRegistrarDetails,
    updateRegistrar,
    deleteRegistrar,
    deleteRegistrarsBulk
} from '../controllers/registrar.controller.js';

import { protect, admin } from '../middlewares/auth.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Registrars
 *   description: Registrar management APIs
 */

/**
 * @swagger
 * /api/registrars/registrars:
 *   get:
 *     summary: List all registrars
 *     tags: [Registrars]
 *     responses:
 *       200:
 *         description: List of registrars
 *   post:
 *     summary: Create a registrar
 *     tags: [Registrars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               website:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registrar created
 */
router.route('/registrars')
    .get(getAllRegistrars)
    .post(protect, admin, createRegistrar);

/**
 * @swagger
 * /api/registrars/registrars/bulk-delete:
 *   post:
 *     summary: Bulk delete registrars
 *     tags: [Registrars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registrars deleted
 */
router.route('/registrars/bulk-delete')
    .post(protect, admin, deleteRegistrarsBulk);

/**
 * @swagger
 * /api/registrars/registrars/{id}:
 *   get:
 *     summary: Get registrar by ID
 *     tags: [Registrars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registrar details
 *   put:
 *     summary: Update registrar
 *     tags: [Registrars]
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
 *         description: Registrar updated
 *   delete:
 *     summary: Delete registrar
 *     tags: [Registrars]
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
 *         description: Registrar deleted
 */
router.route('/registrars/:id')
    .get(getRegistrarDetails)
    .put(protect, admin, updateRegistrar)
    .delete(protect, admin, deleteRegistrar);

export default router;
