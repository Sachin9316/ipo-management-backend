import Mainboard from '../models/mainboard.model.js';
import AllotmentResult from '../models/AllotmentResult.js';
import { checkKFintechStatus } from '../services/kfintech.service.js';
// import { checkLinkIntimeStatus } from '../services/linkintime.service.js'; // Future

const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export const checkAllotment = async (req, res) => {
    try {
        const { ipoName, registrar, panNumbers } = req.body;

        if (!ipoName || !panNumbers || !Array.isArray(panNumbers)) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        // 1. Find the IPO to link results
        // We need the IPO ID for the foreign key in AllotmentResult
        const ipo = await Mainboard.findOne({
            $or: [
                { companyName: ipoName },
                { slug: ipoName } // In case slug is passed
            ]
        });

        if (!ipo) {
            return res.status(404).json({ success: false, message: 'IPO not found in database' });
        }

        // 2. Check Cache
        const results = [];
        const pansToCheck = [];
        const now = new Date();

        for (const pan of panNumbers) {
            const existing = await AllotmentResult.findOne({ ipoId: ipo._id, panNumber: pan });

            // valid if exists AND (status is ALLOTTED/NOT_ALLOTTED OR (UNKNOWN/ERROR and checked significantly recently?))
            // Actually, if it's UNKNOWN or ERROR, we might want to retry sooner?
            // For now, strict TTL for all

            if (existing && (now - new Date(existing.lastChecked) < CACHE_DURATION_MS)) {
                results.push({
                    pan: existing.panNumber,
                    status: existing.status,
                    units: existing.units,
                    message: existing.message || (existing.status === 'ALLOTTED' ? `Allotted ${existing.units} shares` : 'Not Allotted')
                });
            } else {
                pansToCheck.push(pan);
            }
        }

        // 3. Fetch from Registrar if needed
        if (pansToCheck.length > 0) {
            let apiResponse = { details: [] };
            const reg = registrar ? registrar.toUpperCase() : '';

            if (reg.includes('KFIN') || reg.includes('KFINTECH')) {
                apiResponse = await checkKFintechStatus(ipo.companyName, pansToCheck);
            } else if (reg.includes('LINK') || reg.includes('MUFG')) {
                // apiResponse = await checkLinkIntimeStatus(ipo.companyName, pansToCheck);
                // Fallback for now
                apiResponse = {
                    details: pansToCheck.map(p => ({ pan: p, status: 'UNKNOWN', message: 'LinkIntime automation coming soon' }))
                };
            } else {
                apiResponse = {
                    details: pansToCheck.map(p => ({ pan: p, status: 'UNKNOWN', message: 'Registrar automation not supported' }))
                };
            }

            // 4. Update Cache & Merge Results
            for (const item of apiResponse.details) {
                // Save to DB
                await AllotmentResult.findOneAndUpdate(
                    { ipoId: ipo._id, panNumber: item.pan },
                    {
                        status: item.status,
                        units: item.units || 0,
                        message: item.message,
                        lastChecked: new Date()
                    },
                    { upsert: true, new: true }
                );

                results.push(item);
            }
        }

        // Return standardized response
        res.json({
            success: true,
            summary: {
                allotted: results.filter(r => r.status === 'ALLOTTED').length,
                notAllotted: results.filter(r => r.status === 'NOT_ALLOTTED').length,
                unknown: results.filter(r => r.status === 'UNKNOWN' || r.status === 'NOT_APPLIED').length,
                error: results.filter(r => r.status === 'ERROR').length
            },
            data: results
        });

    } catch (error) {
        console.error('Check Allotment Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
