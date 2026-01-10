import { matchRegistrar } from '../utils/registrar-matcher.js';
import Registrar from '../models/Registrar.js';
import { scrapeAndSaveIPOData } from '../services/scraper.service.js';

console.log('Imports successful');
console.log('matchRegistrar:', typeof matchRegistrar);
console.log('Registrar:', Registrar);
console.log('scrapeAndSaveIPOData:', typeof scrapeAndSaveIPOData);
