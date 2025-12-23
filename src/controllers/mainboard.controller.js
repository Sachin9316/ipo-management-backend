import Mainboard from "../models/mainboard.model.js";
import { serverErrorHandler } from "../utils/serverErrorHandling.js";

export const createMainboard = async (req, res) => {
    try {
        const mainboardData = req.validated.body;

        if (!mainboardData.slug) {
            mainboardData.slug = mainboardData.companyName.toLowerCase().replace(/ /g, "-");
        }

        const newMainboard = new Mainboard(mainboardData);
        await newMainboard.save();

        return res.status(201).json({
            success: true,
            message: "Mainboard created successfully",
            data: newMainboard,
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "IPO already exists with the same slug",
            });
        }

        serverErrorHandler(error, res);
    }
};


export const getAllMainboards = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        console.log("Incoming Query:", req.query);
        if (req.query.status) {
            filter.status = req.query.status.toUpperCase();
        }
        if (req.query.ipoType) {
            filter.ipoType = req.query.ipoType.toUpperCase();
        }
        console.log("Applied Filter:", filter);

        const mainboards = await Mainboard.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const total = await Mainboard.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            message: "Mainboards fetched successfully",
            data: mainboards,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

export const getMainboardById = async (req, res) => {
    try {
        const { id } = req.params;
        const mainboard = await Mainboard.findById(id);
        if (!mainboard) {
            return res.status(404).json({ message: "Mainboard not found" });
        }
        res.status(200).json({
            success: true,
            message: "Mainboard fetched successfully",
            data: mainboard
        });
    }
    catch (error) {
        serverErrorHandler(error, res);
    }
};

export const updateMainboardById = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.validated?.body || req.body;

        delete updateData.slug;

        const updatedMainboard = await Mainboard.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedMainboard) {
            return res.status(404).json({
                success: false,
                message: "Mainboard not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Mainboard updated successfully",
            data: updatedMainboard,
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "IPO with same slug already exists",
            });
        }

        serverErrorHandler(error, res);
    }
};

export const deleteMainboardById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMainboard = await Mainboard.findByIdAndDelete(id);
        if (!deletedMainboard) {
            return res.status(404).json({ message: "Mainboard not found" });
        }
        res.status(200).json({ message: "Mainboard deleted successfully" });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

export const getListedIPOs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const listedIPOs = await Mainboard.find({ status: 'LISTED' }).skip(skip).limit(limit);
        const total = await Mainboard.countDocuments({ status: 'LISTED' });
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            message: "Listed IPOs fetched successfully",
            data: listedIPOs,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};