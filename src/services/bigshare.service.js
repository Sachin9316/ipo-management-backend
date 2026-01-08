import axios from 'axios';
import { getSimilarity } from '../utils/matching.js';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3000';

export const checkBigshareStatus = async (ipoName, panNumbers) => {
    try {
        console.log(`Delegating Bigshare check for "${ipoName}" to WORKER at ${WORKER_URL}`);

        const response = await axios.post(`${WORKER_URL}/check-bigshare`, {
            ipoName,
            panNumbers
        });

        return response.data;

    } catch (error) {
        console.error('Error calling Bigshare Worker:', error.message);
        if (error.response) {
            console.error('Worker Response:', error.response.data);
        }
        return {
            details: panNumbers.map(pan => ({ pan, status: 'ERROR', message: 'Worker Request Failed' }))
        };
    }
};
