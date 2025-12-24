
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Mainboard from './models/mainboard.model.js';
import dbConnect from './config/db.js';

dotenv.config();

const DUMMY_IPOS = [
    // Mainboard - Open
    {
        id: '1', name: 'Zomato Limited', type: 'Mainboard', status: 'Open',
        priceRange: '₹450 - ₹500', openDate: '2025-01-10', closeDate: '2025-01-12',
        lotSize: '30', issueSize: '1200 Cr',
        gmp: 60, subscription: 45.5,
        dates: { offerStart: '2025-01-10', offerEnd: '2025-01-12', allotment: '2025-01-15', refund: '2025-01-16', listing: '2025-01-18' }
    },
    {
        id: '2', name: 'LIC India', type: 'Mainboard', status: 'Open',
        priceRange: '₹900 - ₹949', openDate: '2025-01-11', closeDate: '2025-01-13',
        lotSize: '15', issueSize: '21000 Cr',
        gmp: 40, subscription: 2.5,
        dates: { offerStart: '2025-01-11', offerEnd: '2025-01-13', allotment: '2025-01-16', refund: '2025-01-17', listing: '2025-01-20' }
    },
    {
        id: '3', name: 'Ola Electric', type: 'Mainboard', status: 'Open',
        priceRange: '₹72 - ₹76', openDate: '2025-01-12', closeDate: '2025-01-14',
        lotSize: '195', issueSize: '5500 Cr',
        gmp: 10, subscription: 4.2,
        dates: { offerStart: '2025-01-12', offerEnd: '2025-01-14', allotment: '2025-01-17', refund: '2025-01-18', listing: '2025-01-21' }
    },
    {
        id: '4', name: 'Swiggy', type: 'Mainboard', status: 'Open',
        priceRange: '₹371 - ₹390', openDate: '2025-01-13', closeDate: '2025-01-15',
        lotSize: '38', issueSize: '11000 Cr',
        gmp: 0, subscription: 3.6,
        dates: { offerStart: '2025-01-13', offerEnd: '2025-01-15', allotment: '2025-01-18', refund: '2025-01-19', listing: '2025-01-22' }
    },
    // Mainboard - Upcoming
    {
        id: '6', name: 'Hyundai India', type: 'Mainboard', status: 'Upcoming',
        priceRange: '₹1865 - ₹1960', openDate: '2025-02-01', closeDate: '2025-02-03',
        lotSize: '7', issueSize: '25000 Cr',
        gmp: 120, subscription: 0,
        dates: { offerStart: '2025-02-01', offerEnd: '2025-02-03', allotment: '2025-02-06', refund: '2025-02-07', listing: '2025-02-10' }
    },
    {
        id: '7', name: 'PhonePe', type: 'Mainboard', status: 'Upcoming',
        priceRange: '₹500 - ₹550', openDate: '2025-02-05', closeDate: '2025-02-07',
        lotSize: '25', issueSize: '8000 Cr',
        gmp: 80, subscription: 0,
        dates: { offerStart: '2025-02-05', offerEnd: '2025-02-07', allotment: '2025-02-10', refund: '2025-02-11', listing: '2025-02-14' }
    },
    // Mainboard - Closed
    {
        id: '11', name: 'Tata Technologies', type: 'Mainboard', status: 'Closed',
        priceRange: '₹475 - ₹500', openDate: '2023-11-22', closeDate: '2023-11-24',
        lotSize: '30', issueSize: '3042 Cr',
        gmp: 400, subscription: 69.4,
        dates: { offerStart: '2023-11-22', offerEnd: '2023-11-24', allotment: '2023-11-28', refund: '2023-11-29', listing: '2023-11-30' }
    },
    {
        id: '12', name: 'JSW Infra', type: 'Mainboard', status: 'Closed',
        priceRange: '₹113 - ₹119', openDate: '2023-09-25', closeDate: '2023-09-27',
        lotSize: '126', issueSize: '2800 Cr',
        gmp: 30, subscription: 37.3,
        dates: { offerStart: '2023-09-25', offerEnd: '2023-09-27', allotment: '2023-10-03', refund: '2023-10-04', listing: '2023-10-06' }
    },

    // SME - Open
    {
        id: '21', name: 'TechSME Solutions', type: 'SME', status: 'Open',
        priceRange: '₹120 - ₹125', openDate: '2025-01-10', closeDate: '2025-01-12',
        lotSize: '1000', issueSize: '50 Cr',
        gmp: 50, subscription: 85.2,
        dates: { offerStart: '2025-01-10', offerEnd: '2025-01-12', allotment: '2025-01-15', refund: '2025-01-16', listing: '2025-01-18' }
    },
    {
        id: '22', name: 'AgroSME Ind', type: 'SME', status: 'Open',
        priceRange: '₹80 - ₹85', openDate: '2025-01-11', closeDate: '2025-01-13',
        lotSize: '1600', issueSize: '25 Cr',
        gmp: 15, subscription: 12.5,
        dates: { offerStart: '2025-01-11', offerEnd: '2025-01-13', allotment: '2025-01-16', refund: '2025-01-17', listing: '2025-01-20' }
    },
    // SME - Upcoming
    {
        id: '26', name: 'FutureSME Tech', type: 'SME', status: 'Upcoming',
        priceRange: '₹200 - ₹210', openDate: '2025-02-15', closeDate: '2025-02-17',
        lotSize: '600', issueSize: '40 Cr',
        gmp: 90, subscription: 0,
        dates: { offerStart: '2025-02-15', offerEnd: '2025-02-17', allotment: '2025-02-20', refund: '2025-02-21', listing: '2025-02-24' }
    },
    // Listed IPOs
    {
        id: '101', name: 'Tata Technologies', type: 'Mainboard', status: 'Listed',
        priceRange: '₹475 - ₹500', openDate: '2023-11-22', closeDate: '2023-11-24',
        lotSize: '30', issueSize: '3042 Cr',
        gmp: 400, subscription: 69.43,
        dates: { offerStart: '2023-11-22', offerEnd: '2023-11-24', allotment: '2023-11-28', refund: '2023-11-29', listing: '2023-11-30' },
        listingInfo: { listingPrice: 1200, listingGain: 700, dayHigh: 1400, dayLow: 1150 }
    },
    {
        id: '102', name: 'IREDA', type: 'Mainboard', status: 'Listed',
        priceRange: '₹30 - ₹32', openDate: '2023-11-21', closeDate: '2023-11-23',
        lotSize: '460', issueSize: '2150 Cr',
        gmp: 12, subscription: 38.80,
        dates: { offerStart: '2023-11-21', offerEnd: '2023-11-23', allotment: '2023-11-28', refund: '2023-11-29', listing: '2023-11-29' },
        listingInfo: { listingPrice: 50, listingGain: 18, dayHigh: 60, dayLow: 48 }
    },
    {
        id: '103', name: 'Gandhar Oil Refinery', type: 'Mainboard', status: 'Listed',
        priceRange: '₹160 - ₹169', openDate: '2023-11-22', closeDate: '2023-11-24',
        lotSize: '88', issueSize: '500 Cr',
        gmp: 75, subscription: 64.07,
        dates: { offerStart: '2023-11-22', offerEnd: '2023-11-24', allotment: '2023-11-28', refund: '2023-11-29', listing: '2023-11-30' },
        listingInfo: { listingPrice: 298, listingGain: 129, dayHigh: 344, dayLow: 295 }
    },
    {
        id: '104', name: 'Flair Writing', type: 'Mainboard', status: 'Listed',
        priceRange: '₹288 - ₹304', openDate: '2023-11-22', closeDate: '2023-11-24',
        lotSize: '49', issueSize: '593 Cr',
        gmp: 85, subscription: 46.68,
        dates: { offerStart: '2023-11-22', offerEnd: '2023-11-24', allotment: '2023-11-28', refund: '2023-11-29', listing: '2023-12-01' },
        listingInfo: { listingPrice: 503, listingGain: 199, dayHigh: 514, dayLow: 450 }
    },
    {
        id: '105', name: 'Honasa Consumer (Mamaearth)', type: 'Mainboard', status: 'Listed',
        priceRange: '₹308 - ₹324', openDate: '2023-10-31', closeDate: '2023-11-02',
        lotSize: '46', issueSize: '1701 Cr',
        gmp: 30, subscription: 7.61,
        dates: { offerStart: '2023-10-31', offerEnd: '2023-11-02', allotment: '2023-11-07', refund: '2023-11-08', listing: '2023-11-07' },
        listingInfo: { listingPrice: 330, listingGain: 6, dayHigh: 340, dayLow: 325 }
    },
    {
        id: '106', name: 'Mankind Pharma', type: 'Mainboard', status: 'Listed',
        priceRange: '₹1026 - ₹1080', openDate: '2023-04-25', closeDate: '2023-04-27',
        lotSize: '13', issueSize: '4326 Cr',
        gmp: 90, subscription: 15.32,
        dates: { offerStart: '2023-04-25', offerEnd: '2023-04-27', allotment: '2023-05-03', refund: '2023-05-04', listing: '2023-05-09' },
        listingInfo: { listingPrice: 1300, listingGain: 220, dayHigh: 1430, dayLow: 1300 }
    },
    {
        id: '107', name: 'JSW Infrastructure', type: 'Mainboard', status: 'Listed',
        priceRange: '₹113 - ₹119', openDate: '2023-09-25', closeDate: '2023-09-27',
        lotSize: '126', issueSize: '2800 Cr',
        gmp: 18, subscription: 37.37,
        dates: { offerStart: '2023-09-25', offerEnd: '2023-09-27', allotment: '2023-10-03', refund: '2023-10-04', listing: '2023-10-03' },
        listingInfo: { listingPrice: 143, listingGain: 24, dayHigh: 157, dayLow: 141 }
    }
];

const seedDB = async () => {
    try {
        await dbConnect();
        console.log('Connected to DB');

        console.log('Clearing existing data...');
        await Mainboard.deleteMany({}); // Optional: Clear old data

        const ipoDocs = DUMMY_IPOS.map(ipo => {
            const priceParts = ipo.priceRange.replace(/₹/g, '').split('-').map(p => parseInt(p.trim()));
            const lotPrice = priceParts[priceParts.length - 1] || 0; // Use upper band or single price

            return {
                companyName: ipo.name,
                slug: ipo.name.toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substr(2, 5), // Unique slug
                icon: ipo.logoUrl || 'https://via.placeholder.com/50', // Default icon
                ipoType: ipo.type === 'SME' ? 'SME' : 'MAINBOARD',
                status: ipo.status.toUpperCase(),
                gmp: [{
                    price: typeof ipo.gmp === 'number' ? ipo.gmp : 0,
                    kostak: '0',
                    date: new Date()
                }],
                subscription: {
                    qib: 0,
                    nii: 0,
                    retail: 0,
                    employee: 0,
                    total: parseFloat(ipo.subscription) || 0
                },
                open_date: new Date(ipo.dates.offerStart),
                close_date: new Date(ipo.dates.offerEnd),
                listing_date: new Date(ipo.dates.listing),
                refund_date: new Date(ipo.dates.refund),
                allotment_date: new Date(ipo.dates.allotment),
                lot_size: parseInt(ipo.lotSize) || 0,
                lot_price: lotPrice,
                min_price: priceParts[0] || lotPrice,
                max_price: priceParts[1] || lotPrice,
                bse_code_nse_code: 'BSE/NSE',
                isAllotmentOut: ipo.status === 'Closed',
                rhp_pdf: '',
                drhp_pdf: '',
                financials: {
                    revenue: 0,
                    profit: 0,
                    eps: 0,
                    valuation: ''
                },
                listing_info: {
                    listing_price: ipo.listingInfo?.listingPrice || 0,
                    listing_gain: ipo.listingInfo?.listingGain || 0,
                    day_high: ipo.listingInfo?.dayHigh || 0,
                    day_low: ipo.listingInfo?.dayLow || 0
                }
            };
        });

        await Mainboard.insertMany(ipoDocs);
        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
