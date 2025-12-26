import express from 'express';
import { checkAllotment } from '../controllers/allotment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public route for allotment checking
router.post('/check', checkAllotment);

export default router;
