import { fetchChittorgarhAPIData } from '../services/chittorgarh-list.service.js';

const checkKeys = async () => {
    try {
        console.log('Fetching lists...');
        const list = await fetchChittorgarhAPIData();
        if (list.length > 0) {
            console.log('Sample Item Keys:', Object.keys(list[0]));
            console.log('Sample Item:', JSON.stringify(list[0], null, 2));

            // Check specifically for Modern Diagnostic if present
            const modern = list.find(i => i['Company Name'] && i['Company Name'].includes('Modern'));
            if (modern) {
                console.log('Modern Diagnostic Item:', JSON.stringify(modern, null, 2));
            } else {
                console.log('Modern Diagnostic not found in list.');
            }
        } else {
            console.log('List is empty.');
        }
    } catch (e) {
        console.error(e);
    }
};

checkKeys();
