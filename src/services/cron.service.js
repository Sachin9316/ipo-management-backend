import cron from 'node-cron';
import Mainboard from '../models/mainboard.model.js';
import AllotmentResult from '../models/AllotmentResult.js';
import { checkKFintechStatus } from './kfintech.service.js';

// Schedule: Every 6 hours
const SCHEDULE = '0 */6 * * *';

export const startCronJobs = () => {
    console.log('Starting Cron Jobs...');

    cron.schedule(SCHEDULE, async () => {
        console.log('Running Allotment Status Refresh Job...');
        await refreshAllotmentStatus();
    });
};

const refreshAllotmentStatus = async () => {
    try {
        // 1. Find relevant IPOs (Allotment out recently, or upcoming listing)
        // Filter: listing_date is in the future OR was in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const ipos = await Mainboard.find({
            $or: [
                { listing_date: { $gte: sevenDaysAgo } },
                { isAllotmentOut: true } // Or explicitly marked as out
            ]
        });

        console.log(`Found ${ipos.length} IPOs for potential refresh.`);

        for (const ipo of ipos) {
            // 2. Find results that need refresh (UNKNOWN, ERROR, maybe NOT_ALLOTTED if very early)
            // We focus on UNKNOWN and ERROR for now to fix issues.
            const pendingResults = await AllotmentResult.find({
                ipoId: ipo._id,
                status: { $in: ['UNKNOWN', 'ERROR'] }
            });

            if (pendingResults.length === 0) continue;

            console.log(`Refreshing ${pendingResults.length} records for ${ipo.companyName}`);

            const panNumbers = pendingResults.map(r => r.panNumber);
            const registrar = ipo.registrarName ? ipo.registrarName.toUpperCase() : '';

            let apiResponse = { details: [] };

            if (registrar.includes('KFIN')) {
                apiResponse = await checkKFintechStatus(ipo.companyName, panNumbers);
            }
            // LinkIntime future support here

            // 3. Update DB
            for (const item of apiResponse.details) {
                if (item.status !== 'UNKNOWN' && item.status !== 'ERROR') {
                    await AllotmentResult.updateOne(
                        { ipoId: ipo._id, panNumber: item.pan },
                        {
                            status: item.status,
                            units: item.units || 0,
                            message: item.message,
                            lastChecked: new Date()
                        }
                    );
                    console.log(`Updated ${item.pan} to ${item.status}`);
                }
            }
        }
    } catch (error) {
        console.error('Error in Allotment Refresh Cron:', error);
    }
};
