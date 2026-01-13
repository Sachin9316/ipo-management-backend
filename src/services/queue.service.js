import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import AllotmentResult from '../models/AllotmentResult.js';
import {
    scrapeKFintechOnRemote,
    scrapeBigshareOnRemote,
    scrapeMUFGOnRemote
} from './remote-scraper.service.js';
import Mainboard from '../models/mainboard.model.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
});

connection.on('connect', () => {
    console.log('✅ Redis Connected Successfully');
});

export const allotmentQueue = new Queue('allotment-status', { connection });

// Define the Worker Processor
const workerHandler = async (job) => {
    const { ipoId, ipoName, panNumber, clientId, registrar } = job.data;
    console.log(`[Job ${job.id}] Processing allotment check for ${panNumber} in ${ipoName} (${registrar || 'KFINTECH'})`);

    try {
        // 1. Perform the scrape - Route based on registrar
        const scraperInput = {
            companyName: ipoName,
            kfintech_client_id: clientId
        };

        let result;
        const registrarUpper = (registrar || 'KFINTECH').toUpperCase();

        if (registrarUpper.includes('BIGSHARE')) {
            result = await scrapeBigshareOnRemote(scraperInput, [panNumber]);
        } else if (registrarUpper.includes('MUFG') || registrarUpper.includes('LINK')) {
            result = await scrapeMUFGOnRemote(scraperInput, [panNumber]);
        } else {
            // Default to KFintech
            result = await scrapeKFintechOnRemote(scraperInput, [panNumber]);
        }

        if (!result) {
            throw new Error("Scraper returned null/undefined result");
        }

        const status = result.details && result.details.length > 0 ? result.details[0] : null;

        if (status) {
            // CRITICAL: Validate that the result is for the correct IPO
            // The remote worker might return results from a different IPO if the PAN exists in multiple IPOs
            // For now, we'll save the result but log a warning if it seems suspicious

            // Check if the status indicates the PAN was not found/applied
            const isNotFound = ['NOT_APPLIED', 'NOT_ALLOTTED', 'UNKNOWN', 'ERROR'].includes(status.status);

            // If we got a positive result (ALLOTTED), we should be more careful
            // Unfortunately, the remote worker doesn't return the IPO name in the response
            // So we can't validate it here. This is a limitation of the current architecture.

            console.log(`[Job ${job.id}] Scraper returned: ${status.status} for ${panNumber} in ${ipoName}`);

            // 2. Save/Update Result in DB with the ipoId from the job
            await AllotmentResult.findOneAndUpdate(
                { ipoId, panNumber },
                {
                    status: status.status || 'UNKNOWN',
                    units: status.units || 0,
                    message: status.message || '',
                    lastChecked: new Date()
                },
                { upsert: true, new: true }
            );
            console.log(`[Job ${job.id}] Saved status: ${status.status} for ipoId: ${ipoId}`);
        } else {
            console.warn(`[Job ${job.id}] No result returned from remote worker for ${ipoName}`);
        }

        return status;

    } catch (error) {
        console.error(`[Job ${job.id}] Failed: ${error.message}`);
        throw error; // Triggers BullMQ retry
    }
};

// Initialize Worker
// Concurrency: 5 (Adjust based on your Remote Worker's capacity)
export const initWorker = () => {
    const worker = new Worker('allotment-status', workerHandler, {
        connection,
        concurrency: 50 // Increased to 50 for high scalability with Single Browser
    });

    worker.on('completed', (job) => {
        console.log(`[Job ${job.id}] Completed!`);
    });

    worker.on('failed', async (job, err) => {
        console.error(`[Job ${job.id}] Failed with ${err.message}`);

        // CRITICAL: Update DB to ERROR so frontend stops spinning
        if (job && job.data) {
            try {
                const { ipoId, panNumber } = job.data;
                await AllotmentResult.findOneAndUpdate(
                    { ipoId, panNumber },
                    {
                        status: 'ERROR',
                        message: `Worker Failed: ${err.message}`, // Detailed error message
                        lastChecked: new Date()
                    },
                    { upsert: true }
                );
                console.log(`[Job ${job.id}] Marked as ERROR in DB for ${panNumber}`);
            } catch (dbError) {
                console.error(`[Job ${job.id}] Failed to update DB on error:`, dbError.message);
            }
        }
    });

    console.log('Worker initialized for allotment-status queue');
    return worker;
};

// Helper to add jobs
export const addToQueue = async (data) => {
    return await allotmentQueue.add('check-allotment', data, {
        removeOnComplete: true,
        removeOnFail: 1000 // Keep last 1000 failed jobs for debugging
    });
};

export const addBulkToQueue = async (jobsData) => {
    const jobs = jobsData.map(data => ({
        name: 'check-allotment',
        data: data,
        opts: { removeOnComplete: true }
    }));
    return await allotmentQueue.addBulk(jobs);
};
