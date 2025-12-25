import express from "express";
import {
    registerUser,
    loginUser,
    verifyEmail,
    adminPing,
    getMe,
    updateProfile,
    forgotPassword,
    resetPassword,
    verifyEmailLink,
    startMagicLogin,
    verifyMagicLink,
    checkMagicLoginStatus
} from "../controllers/auth.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyEmail);
router.get("/verify-email-link", verifyEmailLink);
router.post("/magic-start", startMagicLogin);
router.get("/magic-verify", verifyMagicLink);
router.post("/magic-check", checkMagicLoginStatus);
router.post("/admin/ping", protect, admin, adminPing);
router.get("/me", protect, getMe);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
