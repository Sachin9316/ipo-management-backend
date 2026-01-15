import { addBulkToQueue } from './queue.service.js';
import AllotmentResult from '../models/AllotmentResult.js';

/**
 * Check KFintech allotment status: Check DB -> Queue if Missing -> Return CHECKING
 */
export const checkKFintechStatus = async (ipo, panNumbers) => {
    try {
        console.log(`Checking status for ${panNumbers.length} PANs for ${ipo.companyName} (Async)`);

        // 1. Check DB Cache explicitly
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

            // CHECK STALE STATUS: If status is CHECKING but it's been more than 60s, assume worker died and re-queue
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
                    console.warn(`⚠️ Stale CHECKING status found for ${pan} (Last checked: ${found.lastChecked}). Re-queuing.`);
                }
                details.push({ pan, status: 'CHECKING', message: 'Checking...' });
                missingPANs.push(pan);
            }
        }

        // 2. Queue Missing
        if (missingPANs.length > 0) {
            console.log(`Queuing ${missingPANs.length} PANs for background check.`);

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

            // Format jobs
            const jobs = missingPANs.map(pan => ({
                ipoId: ipo._id,
                ipoName: ipo.companyName,
                clientId: ipo.kfintech_client_id, // Pass if available
                panNumber: pan,
                registrar: 'KFINTECH'
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
        console.error('Error in Async KFintech Check:', error.message);
        return {
            summary: { allotted: 0, notAllotted: 0, error: panNumbers.length, checking: 0 },
            details: panNumbers.map(pan => ({ pan, status: 'ERROR', message: error.message }))
        };
    }
};
