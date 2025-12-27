import express from 'express';
import { getListedIPOs, deleteMainboardBulk } from '../controllers/mainboard.controller.js';

const router = express.Router();

router.get('/listed-ipos', getListedIPOs);
router.post('/bulk-delete', deleteMainboardBulk);

export default router;