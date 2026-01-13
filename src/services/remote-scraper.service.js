import axios from 'axios';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3000';

/**
 * Check allotment status using Playwright browser automation VIA WORKER.
 * This is the "Slow" function that actually does the work.
 */
export const scrapeKFintechOnRemote = async (ipo, panNumbers) => {
    try {
        console.log(`Delegating KFintech check for "${ipo.companyName}" to WORKER at ${WORKER_URL}`);

        const response = await axios.post(`${WORKER_URL}/check-status`, {
            ipoName: ipo.companyName,
            clientId: ipo.kfintech_client_id, // Pass if available
            panNumbers
        });

        return response.data;
    } catch (error) {
        console.error('Error calling KFintech Worker:', error.message);
        if (error.response) {
            console.error('Worker Response:', error.response.data);
        }

        return {
            summary: { allotted: 0, notAllotted: 0, error: panNumbers.length },
            details: panNumbers.map(pan => ({ pan, status: 'NOT_APPLIED', message: 'No record found (Worker Error)' }))
        };
    }
};

export const scrapeBigshareOnRemote = async (ipo, panNumbers) => {
    try {
        console.log(`Delegating Bigshare check for "${ipo.companyName}" to WORKER at ${WORKER_URL}`);

        const response = await axios.post(`${WORKER_URL}/check-bigshare`, {
            ipoName: ipo.companyName,
            panNumbers
        });

        return response.data;

    } catch (error) {
        console.error('Error calling Bigshare Worker:', error.message);
        if (error.response) {
            console.error('Worker Response:', error.response.data);
        }
        return {
            details: panNumbers.map(pan => ({ pan, status: 'NOT_APPLIED', message: 'No record found (Worker Error)' }))
        };
    }
};

export const scrapeMUFGOnRemote = async (ipo, panNumbers) => {
    try {
        console.log(`Delegating MUFG check for "${ipo.companyName}" to WORKER at ${WORKER_URL}`);

        const response = await axios.post(`${WORKER_URL}/check-mufg`, {
            ipoName: ipo.companyName,
            panNumbers
        });

        return response.data;
    } catch (error) {
        console.error('Error calling MUFG Worker:', error.message);
        if (error.response) {
            console.error('Worker Response:', error.response.data);
        }

        return {
            details: panNumbers.map(pan => ({ pan, status: 'NOT_APPLIED', message: 'No record found (Worker Error)' }))
        };
    }
};
