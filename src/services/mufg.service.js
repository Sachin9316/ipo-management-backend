import axios from 'axios';
import { getSimilarity } from '../utils/matching.js';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3000';

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

export const checkMUFGStatus = async (ipoName, panNumbers) => {
    try {
        console.log(`Delegating MUFG check for "${ipoName}" to WORKER at ${WORKER_URL}`);

        const response = await axios.post(`${WORKER_URL}/check-mufg`, {
            ipoName,
            panNumbers
        });

        return response.data;
    } catch (error) {
        console.error('Error calling MUFG Worker:', error.message);
        if (error.response) {
            console.error('Worker Response:', error.response.data);
        }

        return {
            details: panNumbers.map(pan => ({ pan, status: 'NOT_APPLIED', message: 'No record found' }))
        };
    }
};
