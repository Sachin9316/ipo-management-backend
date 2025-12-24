import express from 'express';
const mainboardRoute = express.Router();
import {
    createMainboard,
    getAllMainboards,
    getMainboardById,
    updateMainboardById,
    deleteMainboardById
} from '../controllers/mainboard.controller.js';
import { ipoCreateSchema, ipoUpdateSchema } from '../schema/mainboard.schema.js';
import { zodValidate } from '../middlewares/zod.middleware.js';

import upload from '../middlewares/multer.middleware.js';
import { parseJsonFields } from '../middlewares/jsonParser.middleware.js';

mainboardRoute.post('/mainboards', upload.single('icon'), parseJsonFields, zodValidate(ipoCreateSchema), createMainboard);
mainboardRoute.get('/mainboards', getAllMainboards);
mainboardRoute.get('/mainboard/:id', getMainboardById);
mainboardRoute.patch("/mainboard/:id", upload.single('icon'), parseJsonFields, zodValidate(ipoUpdateSchema), updateMainboardById);
mainboardRoute.delete('/mainboard/:id', deleteMainboardById);

export default mainboardRoute;