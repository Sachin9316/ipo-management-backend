import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import dbConnect from './config/db.js';
import smeRoute from './routes/sme.routes.js';
import mainboardRoute from './routes/mainboard.route.js';
import listedRoute from './routes/listed.route.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import registrarRoutes from './routes/registrar.routes.js';
const PORT = process.env.PORT || 5000;
const app = express();
dbConnect();

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use('/api/mainboard', mainboardRoute);
app.use('/api/sme', smeRoute);
app.use('/api/auth', authRoutes);
app.use('/api/registrars', registrarRoutes);
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});