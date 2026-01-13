import { addBulkToQueue } from './queue.service.js';
import AllotmentResult from '../models/AllotmentResult.js';

/**
 * Check Bigshare allotment status: Check DB -> Queue if Missing -> Return CHECKING
 */
export const checkBigshareStatus = async (ipo, panNumbers) => {
    try {
        console.log(`Checking Bigshare status for ${panNumbers.length} PANs for ${ipo.companyName} (Async)`);

        // 1. Check DB Cache
        const cachedResults = await AllotmentResult.find({
            ipoId: ipo._id,
            panNumber: { $in: panNumbers }
        });

        const details = [];
        const missingPANs = [];

        for (const pan of panNumbers) {
            const found = cachedResults.find(r => r.panNumber === pan);
            if (found) {
                details.push({
                    pan,
                    status: found.status,
                    message: found.message,
                    units: found.units
                });
            } else {
                details.push({ pan, status: 'CHECKING', message: 'Checking...' });
                missingPANs.push(pan);
            }
        }

        // 2. Queue Missing
        if (missingPANs.length > 0) {
            console.log(`Queuing ${missingPANs.length} PANs for Bigshare background check.`);

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
                registrar: 'BIGSHARE'
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
        console.error('Error in Async Bigshare Check:', error.message);
        return {
            summary: { allotted: 0, notAllotted: 0, error: panNumbers.length, checking: 0 },
            details: panNumbers.map(pan => ({ pan, status: 'ERROR', message: error.message }))
        };
    }
};
