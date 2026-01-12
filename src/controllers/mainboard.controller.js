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

export const createMainboard = async (req, res) => {
    try {
        const mainboardData = req.validated ? req.validated.body : req.body;

        if (!mainboardData.slug) {
            mainboardData.slug = mainboardData.companyName.toLowerCase().replace(/ /g, "-");
        }

        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                mainboardData.icon = result.secure_url;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                return res.status(500).json({ success: false, message: "Image upload failed" });
            }
        }

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
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const filter = {};

        if (!req.query.ipoType || req.query.ipoType.toUpperCase() !== 'ALL') {
            filter.ipoType = 'MAINBOARD';
        }

        console.log("Incoming Query:", req.query);
        if (req.query.status) {
            if (req.query.status.includes(',')) {
                filter.status = { $in: req.query.status.split(',').map(s => s.trim().toUpperCase()) };
            } else {
                filter.status = req.query.status.toUpperCase();
            }
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
        }
        // Archiving Filter (Default: Hide Archived)
        if (req.query.archived === 'true') {
            filter.isArchived = true;
        } else {
            filter.isArchived = { $ne: true };
        }

        console.log("Applied Filter:", filter);

        const mainboards = await Mainboard.find(filter)
            .select('companyName slug icon ipoType status open_date close_date listing_date lot_size lot_price min_price max_price gmp isAllotmentOut subscription issueSize rhp_pdf drhp_pdf registrarName registrarLink')
            .sort({ open_date: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Mainboard.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        const iposWithProfit = mainboards.map(ipo => {
            const ipoObj = ipo.toObject();
            const latestGmp = ipo.gmp && ipo.gmp.length > 0 ? ipo.gmp[ipo.gmp.length - 1].price : 0;
            ipoObj.est_profit = latestGmp * (ipo.lot_size || 0);
            return ipoObj;
        });

        res.status(200).json({
            success: true,
            message: "Mainboards fetched successfully",
            data: iposWithProfit,
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

        // SMART MERGE: Prevent accidental zeroing of subscription data
        // Fetch existing document first
        const existingMainboard = await Mainboard.findById(id);
        if (!existingMainboard) {
            return res.status(404).json({ success: false, message: "Mainboard not found" });
        }

        if (updateData.subscription) {
            const existingSub = existingMainboard.subscription || {};
            const newSub = updateData.subscription;

            // Keys to check for zero-overwrite protection
            const subKeys = ['qib', 'nii', 'bnii', 'snii', 'retail', 'employee', 'total'];

            subKeys.forEach(key => {
                // If incoming is 0 (likely default/missing in form) AND existing is > 0, keep existing
                if (Number(newSub[key]) === 0 && Number(existingSub[key]) > 0) {
                    newSub[key] = existingSub[key];
                }
            });

            updateData.subscription = newSub;
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

export const getMainboardForEdit = async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch raw document without any transformation if possible, or just standard findById
        // We might want to ensure we get specific fields that form needs
        const mainboard = await Mainboard.findById(id);
        if (!mainboard) {
            return res.status(404).json({ success: false, message: "Mainboard not found" });
        }
        res.status(200).json({
            success: true,
            message: "Mainboard fetched for edit successfully",
            data: mainboard
        });
    } catch (error) {
        serverErrorHandler(error, res);
    }
};

export const manualUpdateMainboard = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body; // Assuming body is already parsed and validated if we add middleware

        delete updateData.slug;
        delete updateData.ipoType;
        // We trust the manual form to provide correct data structure.

        // Handle Image Upload if present (though form might handle it separately, usually passing URL)
        // If file is passed:
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer);
                updateData.icon = result.secure_url;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                return res.status(500).json({ success: false, message: "Image upload failed" });
            }
        }

        // SMART MERGE for Subscription (same protection as generic update to be safe)
        const existingMainboard = await Mainboard.findById(id);
        if (!existingMainboard) {
            return res.status(404).json({ success: false, message: "Mainboard not found" });
        }

        if (updateData.subscription) {
            const existingSub = existingMainboard.subscription || {};
            const newSub = updateData.subscription;
            const subKeys = ['qib', 'nii', 'bnii', 'snii', 'retail', 'employee', 'total'];
            subKeys.forEach(key => {
                if (Number(newSub[key]) === 0 && Number(existingSub[key]) > 0) {
                    // actually for Manual Update, if user sends 0, they MEAN 0?
                    // User said "avoiding accidental fields".
                    // Let's assume manual form sends what user sees. If user sees 0 and saves 0, it should be 0.
                    // BUT, if the form didn't load subscription data correctly, it might send 0.
                    // Risk: User edits Price, form sends 0 for Sub.
                    // Safety: Keep the protection. If user really wants 0, they can set it 0.01 or we rely on frontend sending existing values.
                    // Better: If frontend sends the full object, trust it? 
                    // Let's keep protection for now, it's safer.
                    newSub[key] = existingSub[key];
                }
            });
            updateData.subscription = newSub;
        }

        const updatedMainboard = await Mainboard.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Mainboard manually updated successfully",
            data: updatedMainboard
        });

    } catch (error) {
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
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const listedIPOs = await Mainboard.find({ status: 'LISTED' })
            .select('companyName slug icon ipoType status open_date close_date listing_date lot_size lot_price min_price max_price gmp isAllotmentOut subscription issueSize rhp_pdf drhp_pdf registrarName registrarLink')
            .sort({ listing_date: -1 })
            .skip(skip)
            .limit(limit);
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