import User from "../models/User.model.js";

// @desc    Get all customers (non-admins)
// @route   GET /api/users/customers
// @access  Private/Admin
export const getCustomers = async (req, res) => {
    try {
        const customers = await User.find({ role: { $nin: ["admin", "superadmin"] } }).select("-password");
        res.json(customers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get all users (including admins)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update user PAN documents
// @route   PUT /api/users/:id/pan
// @access  Private/Admin
export const updateUserPan = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.panDocuments = req.body.panDocuments || user.panDocuments;
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                panDocuments: updatedUser.panDocuments
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Add a PAN document (User facing)
// @route   POST /api/users/profile/pan
// @access  Private
export const addMyPan = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            const { panNumber, nameOnPan, dob, documentUrl } = req.body;

            // Check duplicates
            const exists = user.panDocuments.find(p => p.panNumber === panNumber);
            if (exists) {
                return res.status(400).json({ message: "PAN already added" });
            }

            user.panDocuments.push({
                panNumber,
                nameOnPan,
                dob,
                documentUrl,
                status: "PENDING"
            });

            await user.save();
            res.status(201).json(user.panDocuments);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Delete a PAN document (User facing)
// @route   DELETE /api/users/profile/pan/:panNumber
// @access  Private
export const deleteMyPan = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.panDocuments = user.panDocuments.filter(
                (p) => p.panNumber !== req.params.panNumber
            );
            await user.save();
            res.json(user.panDocuments);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
