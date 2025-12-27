import User from "../models/User.model.js";

// @desc    Get user profile (User facing)
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                panDocuments: user.panDocuments,
                watchlist: user.watchlist
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

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

// @desc    Update user (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.role = req.body.role || user.role;
            user.phoneNumber = req.body.phoneNumber || user.phoneNumber;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phoneNumber: updatedUser.phoneNumber,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await user.deleteOne();
            res.json({ message: "User removed" });
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
            const { panNumber, name, dob, documentUrl } = req.body;

            // Check for duplicate
            if (user.panDocuments.some(p => p.panNumber === panNumber)) {
                return res.status(400).json({ message: "PAN already added" });
            }

            user.panDocuments.push({
                panNumber,
                name,
                dob,
                documentUrl,
                status: "VERIFIED" // Setting to VERIFIED for now as we trust the logic
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
// @desc    Get Populated Watchlist
// @route   GET /api/users/profile/watchlist
// @access  Private
export const getWatchlist = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('watchlist');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user.watchlist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const toggleWatchlist = async (req, res) => {
    try {
        const { ipoId } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const index = user.watchlist.indexOf(ipoId);
        if (index > -1) {
            user.watchlist.splice(index, 1); // Remove
        } else {
            user.watchlist.push(ipoId); // Add
        }

        await user.save();
        res.json(user.watchlist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const deleteUsersBulk = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Invalid or empty IDs array" });
        }

        const result = await User.deleteMany({ _id: { $in: ids } });

        res.status(200).json({
            message: `${result.deletedCount} users removed`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
