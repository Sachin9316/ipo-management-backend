import User from "../models/User.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import cloudinary from "../config/cloudinary.js";

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpires,
        });

        if (user) {
            // Send OTP Email
            const subject = "Email Verification - Your OTP";
            const text = `Your OTP for email verification is ${otp}. It expires in 10 minutes.`;
            const html = `<p>Your OTP for email verification is <strong>${otp}</strong>. It expires in 10 minutes.</p>`;

            try {
                await sendEmail(user.email, subject, text, html);
            } catch (emailError) {
                console.error("Failed to send verification email:", emailError);
            }

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                // Token removed: User must verify email first
                message: "User registered. Please verify your email.",
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isVerified) {
                return res.status(401).json({
                    message: "Email not verified. Please verify your email first.",
                    isVerified: false
                });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "User already verified" });
        }

        if (user.otp === otp && user.otpExpires > Date.now()) {
            user.isVerified = true;
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();

            res.json({ message: "Email verified successfully" });
        } else {
            res.status(400).json({ message: "Invalid or expired OTP" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const adminPing = async (req, res) => {
    try {
        const { email, message, subject } = req.body;

        if (!email || !message || !subject) {
            return res.status(400).json({ message: "Please provide email, subject, and message" });
        }

        const html = `<p>${message}</p>`;
        await sendEmail(email, subject, message, html);

        res.json({ message: `Email sent to ${email}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to send email" });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password -otp -otpExpires");
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "image", folder: "profiles" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;

            if (req.file) {
                // Delete old image if exists
                if (user.cloudinaryId) {
                    try {
                        await cloudinary.uploader.destroy(user.cloudinaryId);
                    } catch (err) {
                        console.error("Failed to delete old image:", err);
                        // Continue even if delete fails
                    }
                }

                try {
                    const result = await uploadToCloudinary(req.file.buffer);
                    user.profileImage = result.secure_url;
                    user.cloudinaryId = result.public_id;
                } catch (uploadError) {
                    console.error("Upload failed:", uploadError);
                    return res.status(500).json({ message: "Image upload failed" });
                }
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                isVerified: updatedUser.isVerified,
                profileImage: updatedUser.profileImage,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
