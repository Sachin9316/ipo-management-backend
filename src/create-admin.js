import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';
import dbConnect from './config/db.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const createAdmin = async () => {
    try {
        await dbConnect();
        console.log('Connected to DB');

        const email = 'admin@example.com';
        const password = 'password123';

        let user = await User.findOne({ email });

        if (user) {
            console.log('Admin user already exists');
            user.role = 'admin';
            user.password = await bcrypt.hash(password, 10);
            await user.save();
            console.log('Admin user updated');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await User.create({
                name: 'Admin User',
                email,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            console.log('Admin user created');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
