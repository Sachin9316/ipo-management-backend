import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import dbConnect from './config/db.js';
import smeRoute from './routes/sme.routes.js';
import mainboardRoute from './routes/mainboard.route.js';
import listedRoute from './routes/listed.route.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import scraperRoutes from './routes/scraper.routes.js';
import cron from 'node-cron';
import { syncAllGMPData } from './services/gmp-scraper.service.js';
import { scrapeAndSaveIPOData } from './services/scraper.service.js';
import allotmentRoutes from './routes/allotment.routes.js';
import { startCronJobs } from './services/cron.service.js';

// Start Background Jobs
startCronJobs();

import registrarRoutes from './routes/registrar.routes.js';
const PORT = process.env.PORT || 5000;
const app = express();
dbConnect();

cron.schedule('*/15 * * * *', async () => {
    console.log('Running scheduled GMP Sync...');
    try {
        await syncAllGMPData();
        console.log('Scheduled GMP Sync completed successfully.');
    } catch (error) {
        console.error('Scheduled GMP Sync failed:', error.message);
    }
});

cron.schedule('*/15 * * * *', async () => {
    console.log('Running scheduled IPO Sync...');
    try {
        await scrapeAndSaveIPOData(10);
        console.log('Scheduled IPO Sync completed successfully.');
    } catch (error) {
        console.error('Scheduled IPO Sync failed:', error.message);
    }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use('/api/mainboard', mainboardRoute);
app.use('/api/sme', smeRoute);
app.use('/api/listed', listedRoute);
app.use('/api/auth', authRoutes);
app.use('/api/registrars', registrarRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/allotment', allotmentRoutes);

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

import { initWorker } from './services/queue.service.js';

// Initialize Background Workers
initWorker();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});