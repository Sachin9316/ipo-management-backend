import mongoose from 'mongoose';

const registrarSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Registrar name is required'],
        trim: true,
        unique: true
    },
    logo: {
        type: String,
        default: ''
    },
    websiteLink: {
        type: String,
        required: [true, 'Website link is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.model('Registrar', registrarSchema);
