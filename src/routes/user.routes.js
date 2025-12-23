import express from "express";
import { getUsers, getCustomers, getUserById, updateUserPan, addMyPan, deleteMyPan } from "../controllers/user.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// User facing routes
router.route("/profile/pan")
    .post(protect, addMyPan);

router.route("/profile/pan/:panNumber")
    .delete(protect, deleteMyPan);

// Admin routes

router.route("/customers")
    .get(protect, admin, getCustomers);

router.route("/")
    .get(protect, admin, getUsers);

router.route("/:id")
    .get(protect, admin, getUserById);

router.route("/:id/pan")
    .put(protect, admin, updateUserPan);

export default router;
