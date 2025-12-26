import Registrar from '../models/Registrar.js';
import { serverErrorHandler } from "../utils/serverErrorHandling.js";

// Create new registrar
export const createRegistrar = async (req, res) => {
    try {
        const { name, websiteLink, logo, description } = req.body;

        const registrar = await Registrar.create({
            name,
            websiteLink,
            logo,
            description
        });

        res.status(201).json({
            success: true,
            registrar
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

// Get all registrars
export const getAllRegistrars = async (req, res) => {
    try {
        const registrars = await Registrar.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: registrars.length,
            registrars
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

// Get single registrar details
export const getRegistrarDetails = async (req, res) => {
    try {
        const registrar = await Registrar.findById(req.params.id);

        if (!registrar) {
            return res.status(404).json({ message: 'Registrar not found' });
        }

        res.status(200).json({
            success: true,
            registrar
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

// Update registrar
export const updateRegistrar = async (req, res) => {
    try {
        let registrar = await Registrar.findById(req.params.id);

        if (!registrar) {
            return res.status(404).json({ message: 'Registrar not found' });
        }

        registrar = await Registrar.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        res.status(200).json({
            success: true,
            registrar
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

// Delete registrar
export const deleteRegistrar = async (req, res) => {
    try {
        const registrar = await Registrar.findById(req.params.id);

        if (!registrar) {
            return res.status(404).json({ message: 'Registrar not found' });
        }

        await registrar.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Registrar deleted successfully'
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};
