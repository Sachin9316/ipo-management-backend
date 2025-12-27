import Mainboard from "../models/mainboard.model.js";
import { serverErrorHandler } from "../utils/serverErrorHandling.js";

import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                folder: "ipos",
                width: 200,
                height: 200,
                crop: "fill",
                gravity: "center",
                format: "webp" // Optional: force webp for better performance
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export const createMainboard = async (req, res) => {
    try {
        const mainboardData = req.validated ? req.validated.body : req.body;

        if (!mainboardData.slug) {
            mainboardData.slug = mainboardData.companyName.toLowerCase().replace(/ /g, "-");
        }

        // Handle Image Upload
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                mainboardData.icon = result.secure_url;
                // Optional: Store cloudinaryId if you want to delete it later
                // mainboardData.cloudinaryId = result.public_id;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                return res.status(500).json({ success: false, message: "Image upload failed" });
            }
        }

        // Force ipoType to MAINBOARD
        mainboardData.ipoType = 'MAINBOARD';

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

        const filter = {}; // Defaults to empty filter to allow searching ALL types if needed

        // If not searching, we might want to default to MAINBOARD to preserve existing behavior for tabs
        // But for consistency let's stick to explicit requests or default behavior.
        // Existing behavior: "const filter = { ipoType: 'MAINBOARD' };"

        // Revised Logic:
        // Always default to MAINBOARD unless ipoType is explicitly ALL.
        // Even if searching, we should respect the type boundary unless told otherwise.

        if (!req.query.ipoType || req.query.ipoType.toUpperCase() !== 'ALL') {
            filter.ipoType = 'MAINBOARD';
        }

        console.log("Incoming Query:", req.query);
        if (req.query.status) {
            filter.status = req.query.status.toUpperCase();
        }

        if (req.query.ipoType && req.query.ipoType.toUpperCase() !== 'ALL') {
            filter.ipoType = req.query.ipoType.toUpperCase();
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { companyName: searchRegex },
                { bse_code_nse_code: searchRegex }
            ];
            // If searching, we typically want to search ALL types unless restricted
            // The logic above ensures that if 'search' is present, we DON'T auto-set MAINBOARD.
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
        delete updateData.ipoType;

        // Handle Image Upload
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                updateData.icon = result.secure_url;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                return res.status(500).json({ success: false, message: "Image upload failed" });
            }
        }

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

export const deleteMainboardBulk = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or empty IDs array" });
        }

        const result = await Mainboard.deleteMany({ _id: { $in: ids } });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} Mainboard IPOs deleted successfully`,
            deletedCount: result.deletedCount
        });
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