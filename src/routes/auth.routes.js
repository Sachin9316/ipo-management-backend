import express from "express";
import {
    registerUser,
    loginUser,
    verifyEmail,
    adminPing,
    getMe,
    updateProfile,
} from "../controllers/auth.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyEmail);
router.post("/admin/ping", protect, admin, adminPing);
router.get("/me", protect, getMe);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);

export default router;
