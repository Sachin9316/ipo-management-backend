import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

export const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(404).json({ message: "User not found" });
        }

        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Not authorized, token failed" });
    }
};

export const admin = (req, res, next) => {
    console.log("Admin Middleware Check:", req.user ? req.user.role : "No User");
    if (req.user && (req.user.role === "admin" || req.user.role === "superadmin")) {
        next();
    } else {
        res.status(403).json({ message: "Not authorized as an admin" });
    }
};
