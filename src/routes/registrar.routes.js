import express from 'express';
const router = express.Router();
import {
    createRegistrar,
    getAllRegistrars,
    getRegistrarDetails,
    updateRegistrar,
    deleteRegistrar
} from '../controllers/registrar.controller.js';

import { protect, admin } from '../middlewares/auth.middleware.js';

router.route('/registrars')
    .get(getAllRegistrars)
    .post(protect, admin, createRegistrar);

router.route('/registrars/:id')
    .get(getRegistrarDetails)
    .put(protect, admin, updateRegistrar)
    .delete(protect, admin, deleteRegistrar);

export default router;
