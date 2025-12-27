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

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 */
router.get("/me", protect, getMe);

router.post("/verify-otp", verifyEmail);
router.get("/verify-email-link", verifyEmailLink);
router.post("/magic-start", startMagicLogin);
router.get("/magic-verify", verifyMagicLink);
router.post("/magic-check", checkMagicLoginStatus);
router.post("/admin/ping", protect, admin, adminPing);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
