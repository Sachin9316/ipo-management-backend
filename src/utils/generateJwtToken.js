import jwt from "jsonwebtoken";

export const generateJwtToken = (userId) => {
    return jwt.sign(
        { id: userId },       
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};
