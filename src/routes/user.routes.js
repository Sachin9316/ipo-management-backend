import express from "express";
import {
    getUsers, getCustomers, getUserById, updateUserPan, addMyPan,
    deleteMyPan,
    getUserProfile,
    updateUser,
    deleteUser,
    toggleWatchlist,
    getWatchlist
} from "../controllers/user.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// User facing routes
router.route("/profile").get(protect, getUserProfile);
router.route("/profile/pan")
    .post(protect, addMyPan);

router.route("/profile/pan/:panNumber")
    .delete(protect, deleteMyPan);

router.route("/profile/watchlist")
    .get(protect, getWatchlist)
    .post(protect, toggleWatchlist);

// Admin routes

router.route("/customers")
    .get(protect, admin, getCustomers);

router.route("/")
    .get(protect, admin, getUsers);



router.route("/:id/pan")
    .put(protect, admin, updateUserPan);

router.route("/:id")
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser)
    .delete(protect, admin, deleteUser);

export default router;
