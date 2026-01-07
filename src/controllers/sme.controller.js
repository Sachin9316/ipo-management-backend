import Mainboard from "../models/mainboard.model.js";
import { serverErrorHandler } from "../utils/serverErrorHandling.js";

import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                folder: "sme-ipos",
                width: 200,
                height: 200,
                crop: "fill",
                gravity: "center",
                format: "webp"
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export const createSMEIPO = async (req, res) => {
    try {
        const smeData = req.validated ? req.validated.body : req.body;

        if (!smeData.slug) {
            smeData.slug = smeData.companyName.toLowerCase().replace(/ /g, "-");
        }

        // Handle Image Upload
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                smeData.icon = result.secure_url;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                return res.status(500).json({ success: false, message: "SME Image upload failed" });
            }
        }

        // Force ipoType to SME
        smeData.ipoType = 'SME';

        const newSME = new Mainboard(smeData);
        await newSME.save();

        return res.status(201).json({
            success: true,
            message: "SME IPO created successfully",
            data: newSME,
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

export const getAllSMEIPOs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const filter = { ipoType: 'SME' };

        if (req.query.status) {
            if (req.query.status.includes(',')) {
                filter.status = { $in: req.query.status.split(',').map(s => s.trim().toUpperCase()) };
            } else {
                filter.status = req.query.status.toUpperCase();
            }
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { companyName: searchRegex },
                { bse_code_nse_code: searchRegex }
            ];
        }

        const smeIPOs = await Mainboard.find(filter).sort({ open_date: -1 }).skip(skip).limit(limit);
        const total = await Mainboard.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            message: "SME IPOs fetched successfully",
            data: smeIPOs,
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

export const getSMEIPOById = async (req, res) => {
    try {
        const { id } = req.params;
        const smeIPO = await Mainboard.findOne({ _id: id, ipoType: 'SME' });
        if (!smeIPO) {
            return res.status(404).json({ message: "SME IPO not found" });
        }
        res.status(200).json({
            success: true,
            message: "SME IPO fetched successfully",
            data: smeIPO
        });
    }
    catch (error) {
        serverErrorHandler(error, res);
    }
};

export const updateSMEIPOById = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.validated?.body || req.body;

        delete updateData.slug;
        // Ensure we don't accidentally change ipoType
        delete updateData.ipoType;

        // Handle Image Upload
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                updateData.icon = result.secure_url;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                return res.status(500).json({ success: false, message: "SME Image upload failed" });
            }
        }

        const updatedSME = await Mainboard.findOneAndUpdate(
            { _id: id, ipoType: 'SME' },
            { $set: updateData },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedSME) {
            return res.status(404).json({
                success: false,
                message: "SME IPO not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "SME IPO updated successfully",
            data: updatedSME,
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

export const deleteSMEIPOById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSME = await Mainboard.findOneAndDelete({ _id: id, ipoType: 'SME' });
        if (!deletedSME) {
            return res.status(404).json({ message: "SME IPO not found" });
        }
        res.status(200).json({ message: "SME IPO deleted successfully" });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

export const deleteSMEBulk = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or empty IDs array" });
        }

        const result = await Mainboard.deleteMany({ _id: { $in: ids }, ipoType: 'SME' });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} SME IPOs deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};
