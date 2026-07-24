import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({ error: "Access denied. Invalid token format." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contains id, email, name
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid authentication token." });
    }
};

export default authMiddleware;
