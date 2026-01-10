import { scrapeChittorgarhIPOs } from './src/services/chittorgarh-list.service.js';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    const ipos = await scrapeChittorgarhIPOs(3, 'SME');
    ipos.forEach(ipo => {
        console.log(`Company: ${ipo.companyName}`);
        console.log(`  Lot Size: ${ipo.lot_size}`);
        console.log(`  Lot Price: ${ipo.lot_price}`);
        console.log(`  Registrar: ${ipo.registrarName}`);
        console.log(`  Allotment: ${ipo.allotment_date}`);
        console.log(`  Link: ${ipo.link}`);
        console.log('-------------------');
    });
};
test();
