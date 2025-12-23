import express from 'express';
import { getListedIPOs } from '../controllers/mainboard.controller.js';

const router = express.Router();

router.get('/listed-ipos', getListedIPOs);

export default router;