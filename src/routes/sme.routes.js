import express from 'express';
const smeRoute = express.Router();
import {
    createSMEIPO,
    getAllSMEIPOs,
    getSMEIPOById,
    updateSMEIPOById,
    deleteSMEIPOById
} from '../controllers/sme.controller.js';
import { ipoCreateSchema, ipoUpdateSchema } from '../schema/mainboard.schema.js';
import { zodValidate } from '../middlewares/zod.middleware.js';

import upload from '../middlewares/multer.middleware.js';
import { parseJsonFields } from '../middlewares/jsonParser.middleware.js';

smeRoute.post('/sme-ipos', upload.single('icon'), parseJsonFields, zodValidate(ipoCreateSchema), createSMEIPO);
smeRoute.get('/sme-ipos', getAllSMEIPOs);
smeRoute.get('/sme-ipo/:id', getSMEIPOById);
smeRoute.patch("/sme-ipo/:id", upload.single('icon'), parseJsonFields, zodValidate(ipoUpdateSchema), updateSMEIPOById);
smeRoute.delete('/sme-ipo/:id', deleteSMEIPOById);

export default smeRoute;
