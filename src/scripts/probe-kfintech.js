
import axios from 'axios';

const BASE_URL = 'https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query';

const run = async () => {
    console.log('--- PROBE: KFintech API List ---');

    const tryFetch = async (label, params, headers) => {
        try {
            console.log(`\nTrying [${label}]...`);
            const response = await axios.get(BASE_URL, { params, headers });
            if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].clientId) {
                console.log('SUCCESS! Found List:', response.data.slice(0, 2));
            } else {
                console.log('Result:', JSON.stringify(response.data).substring(0, 100));
            }
        } catch (e) {
            console.log(`Error ${e.response?.status}: ${e.message}`);
        }
    };

    // 1. Try generic client_ids or empty headers
    await tryFetch('No Headers', { type: 'pan' }, {});

    // 2. Try type=companies or similar
    await tryFetch('Type=companies', { type: 'companies' }, {});
    await tryFetch('Type=clients', { type: 'clients' }, {});
    await tryFetch('Type=list', { type: 'list' }, {});

    // 3. Try with the headers but empty reqparam?
    await tryFetch('Empty reqparam', { type: 'pan' }, {
        'client_id': '30591384041',
        'reqparam': ''
    });

};

run().catch(console.error);
