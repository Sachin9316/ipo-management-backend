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
            const link = `${req.protocol}://${req.get("host")}/api/auth/verify-email-link?email=${email}&otp=${otp}`;
            const subject = "Email Verification - Verify Your Account";
            const text = `Your OTP for email verification is ${otp}. You can also verify by clicking this link: ${link}`;
            const html = `<p>Your OTP for email verification is <strong>${otp}</strong>.</p>
                          <p>Or click this link to verify: <a href="${link}">Verify Email</a></p>
                          <p>Link expires in 10 minutes.</p>`;

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
                emailPreferences: user.emailPreferences,
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

export const verifyEmailLink = async (req, res) => {
    try {
        const { email, otp } = req.query;

        if (!email || !otp) {
            return res.send("<h1>Invalid Request</h1><p>Missing parameters.</p>");
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.send("<h1>User Not Found</h1>");
        }

        if (user.isVerified) {
            return res.send("<h1>Already Verified</h1><p>Your email is already verified. You can login now.</p>");
        }

        if (user.otp === otp && user.otpExpires > Date.now()) {
            user.isVerified = true;
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();

            res.send("<h1>Email Verified Successfully</h1><p>You can now close this window and login to the app.</p>");
        } else {
            res.send("<h1>Verification Failed</h1><p>Invalid or expired Link.</p>");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
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
        if (user) {
            // Explicitly return fields or just return user object (which now has emailPreferences)
            // returning user object is safer as .select() removed sensitive fields.
            // but let's be explicit if needed or just res.json(user) as before
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
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

            // Handle Email Preferences
            if (req.body.emailPreferences) {
                // If sent as string (multipart/form-data), parse it
                if (typeof req.body.emailPreferences === 'string') {
                    try {
                        user.emailPreferences = JSON.parse(req.body.emailPreferences);
                    } catch (e) {
                        console.error("Failed to parse emailPreferences", e);
                    }
                } else {
                    user.emailPreferences = req.body.emailPreferences;
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
                emailPreferences: updatedUser.emailPreferences,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("--------------------------------");
        console.log("🔑 DEVELOPMENT OTP:", otp);
        console.log("--------------------------------");
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        user.resetPasswordOtp = otp;
        user.resetPasswordExpires = otpExpires;
        await user.save();

        // Send OTP via Email
        const subject = "Password Reset Request";
        const message = `Your OTP for password reset is ${otp}. It expires in 10 minutes.`;
        const html = `<p>You requested a password reset. Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`;

        try {
            await sendEmail(user.email, subject, message, html);
            res.status(200).json({ message: "OTP sent to your email" });
        } catch (emailError) {
            user.resetPasswordOtp = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: "Email could not be sent" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;

        const user = await User.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid OTP or Email, or OTP expired" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.password = hashedPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

export const startMagicLogin = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        let user = await User.findOne({ email });

        // Create user if not exists (implicit registration)
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), salt);
            user = await User.create({
                name: email.split('@')[0],
                email,
                password: hashedPassword,
                role: 'user',
                isVerified: false
            });
        }

        const loginId = crypto.randomBytes(16).toString("hex");
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        user.magicLoginId = loginId;
        user.magicLinkToken = tokenHash;
        user.magicLinkExpires = Date.now() + 10 * 60 * 1000; // 10 mins
        user.magicLinkStatus = "pending";
        await user.save();

        // Send Email
        const verifyUrl = `${req.protocol}://${req.get("host")}/api/auth/magic-verify?id=${loginId}&token=${token}`;
        const message = `Click the button below to login to IPO Wizard: ${verifyUrl}`;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
                .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                .header { background: #6200EE; padding: 30px; text-align: center; } /* Using primary color */
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
                .content { padding: 40px 30px; text-align: center; }
                .content h2 { margin-top: 0; color: #1a1a1a; font-size: 22px; }
                .content p { color: #666; font-size: 16px; margin-bottom: 30px; }
                .btn { display: inline-block; background: #6200EE; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.2s; }
                .btn:hover { background: #5000c9; } /* Darker shade for hover */
                .footer { background: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eaeaea; }
                .link-text { margin-top: 20px; font-size: 12px; color: #999; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>IPO WIZARD</h1>
                </div>
                <div class="content">
                    <h2>Verify your Login</h2>
                    <p>Hello ${user.name || 'User'},</p>
                    <p>You requested a secure login link for IPO Wizard. Click the button below to sign in instantly.</p>
                    <a href="${verifyUrl}" class="btn">Verify Login</a>
                    <p class="link-text">Or copy this link: ${verifyUrl}</p>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} IPO Wizard. All rights reserved.</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        try {
            await sendEmail(user.email, "Log in to IPO Wizard", message, html);
            res.json({ loginId, message: "Magic link sent" });
        } catch (err) {
            console.error("Magic Login Email Error:", err);
            user.magicLinkToken = undefined;
            user.magicLoginId = undefined;
            await user.save();
            return res.status(500).json({
                message: "Email failed: " + (err.message || "Unknown Error"),
                error: err.toString()
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error: " + error.message });
    }
};

export const verifyMagicLink = async (req, res) => {
    try {
        const { id, token } = req.query;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            magicLoginId: id,
            magicLinkToken: tokenHash,
            magicLinkExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.send("<h1>Invalid or Expired Link</h1>");
        }

        user.magicLinkStatus = "verified";
        user.isVerified = true;
        user.magicLinkToken = undefined;
        user.magicLinkExpires = undefined;
        await user.save();

        res.send("<h1>Login Verified!</h1><p>You can go back to the app now.</p>");

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

export const checkMagicLoginStatus = async (req, res) => {
    try {
        const { loginId } = req.body;
        const user = await User.findOne({ magicLoginId: loginId });

        if (!user) return res.status(404).json({ message: "Invalid Login ID" });

        if (user.magicLinkStatus === "verified") {
            const token = generateToken(user._id);
            // Clear login ID so it can't be reused immediately (optional, or rely on expiration)
            user.magicLoginId = undefined;
            user.magicLinkStatus = "pending";
            await user.save();

            return res.json({
                status: "verified",
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified
                }
            });
        }

        res.json({ status: "pending" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
