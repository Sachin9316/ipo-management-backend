import express from "express";
import {
    getUsers, getCustomers, getUserById, updateUserPan, addMyPan,
    deleteMyPan,
    getUserProfile,
    updateUser,
    deleteUser,
    deleteUsersBulk,
    toggleWatchlist,
    getWatchlist
} from "../controllers/user.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// User facing routes
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management APIs
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.route("/profile").get(protect, getUserProfile);

/**
 * @swagger
 * /api/users/profile/pan:
 *   post:
 *     summary: Add PAN to profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: PAN added
 */
router.route("/profile/pan")
    .post(protect, addMyPan);

/**
 * @swagger
 * /api/users/profile/pan/{panNumber}:
 *   delete:
 *     summary: Delete PAN from profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: panNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PAN deleted
 */
router.route("/profile/pan/:panNumber")
    .delete(protect, deleteMyPan);

/**
 * @swagger
 * /api/users/profile/watchlist:
 *   get:
 *     summary: Get user watchlist
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlist items
 *   post:
 *     summary: Toggle watchlist item
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Toggled successfully
 */
router.route("/profile/watchlist")
    .get(protect, getWatchlist)
    .post(protect, toggleWatchlist);

// Admin routes

/**
 * @swagger
 * /api/users/customers:
 *   get:
 *     summary: Get all customers (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of customers
 */
router.route("/customers")
    .get(protect, admin, getCustomers);

/**
 * @swagger
 * /api/users/bulk-delete:
 *   post:
 *     summary: Bulk delete users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users deleted
 */
router.route("/bulk-delete")
    .post(protect, admin, deleteUsersBulk);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.route("/")
    .get(protect, admin, getUsers);

/**
 * @swagger
 * /api/users/{id}/pan:
 *   put:
 *     summary: Update user PAN (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PAN updated
 */
router.route("/:id/pan")
    .put(protect, admin, updateUserPan);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *   put:
 *     summary: Update user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     summary: Delete user (Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.route("/:id")
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser)
    .delete(protect, admin, deleteUser);

export default router;
