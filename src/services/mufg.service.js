import axios from 'axios';
import { addBulkToQueue } from './queue.service.js';
import AllotmentResult from '../models/AllotmentResult.js';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3000';

/**
 * Fetch MUFG IPO List (Keep for dropdown purposes)
 */
export const fetchMUFGIPOList = async () => {
    try {
        console.log(`Delegating MUFG IPO List fetch to WORKER at ${WORKER_URL}`);
        const response = await axios.get(`${WORKER_URL}/ipos-mufg`);
        return response.data;
    } catch (error) {
        console.error("Error fetching MUFG IPO list via worker:", error.message);
        return [];
    }
};

/**
 * Check MUFG/LinkIntime allotment status: Check DB -> Queue if Missing -> Return CHECKING
 */
export const checkMUFGStatus = async (ipo, panNumbers) => {
    try {
        console.log(`Checking MUFG status for ${panNumbers.length} PANs for ${ipo.companyName} (Async)`);

        // 1. Check DB Cache with proper ipoId filtering
        const cachedResults = await AllotmentResult.find({
            ipoId: ipo._id,
            panNumber: { $in: panNumbers }
        });

        const details = [];
        const missingPANs = [];

        const TTL_CHECKING = 60 * 1000; // 60 seconds
        const now = Date.now();

        for (const pan of panNumbers) {
            const found = cachedResults.find(r => r.panNumber === pan);

            // CHECK STALE STATUS
            const isStaleChecking = found && found.status === 'CHECKING' && (now - new Date(found.lastChecked).getTime() > TTL_CHECKING);

            if (found && !isStaleChecking) {
                details.push({
                    pan,
                    status: found.status,
                    message: found.message,
                    units: found.units
                });
            } else {
                if (isStaleChecking) {
                    console.warn(`⚠️ Stale CHECKING status found for ${pan} in MUFG check. Re-queuing.`);
                }
                details.push({ pan, status: 'CHECKING', message: 'Checking...' });
                missingPANs.push(pan);
            }
        }

        // 2. Queue Missing
        if (missingPANs.length > 0) {
            console.log(`Queuing ${missingPANs.length} PANs for MUFG background check.`);

            // CRITICAL: Save CHECKING status to DB *BEFORE* queuing to prevent race condition
            // If we queue first, a fast worker might finish and save result, which we then overwrite with checking!
            const savePromises = missingPANs.map(pan =>
                AllotmentResult.findOneAndUpdate(
                    { ipoId: ipo._id, panNumber: pan },
                    {
                        status: 'CHECKING',
                        message: 'Checking...',
                        units: 0,
                        lastChecked: new Date()
                    },
                    { upsert: true, new: true }
                )
            );
            await Promise.all(savePromises);
            console.log(`✅ Saved CHECKING status for ${missingPANs.length} PANs`);

            const jobs = missingPANs.map(pan => ({
                ipoId: ipo._id,
                ipoName: ipo.companyName,
                panNumber: pan,
                registrar: 'MUFG'
            }));

            await addBulkToQueue(jobs);
        }

        return {
            summary: {
                allotted: details.filter(d => d.status === 'ALLOTTED').length,
                notAllotted: details.filter(d => d.status === 'NOT_ALLOTTED').length,
                checking: details.filter(d => d.status === 'CHECKING').length,
                error: details.filter(d => d.status === 'ERROR').length
            },
            details
        };

    } catch (error) {
        console.error('Error in Async MUFG Check:', error.message);
        return {
            summary: { allotted: 0, notAllotted: 0, error: panNumbers.length, checking: 0 },
            details: panNumbers.map(pan => ({ pan, status: 'ERROR', message: error.message }))
        };
    }
};
