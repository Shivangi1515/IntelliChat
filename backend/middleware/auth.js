import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");
    const guestUser = { id: "000000000000000000000000", email: "guest@intellichat.com", name: "Guest User" };

    if (!authHeader) {
        req.user = guestUser;
        return next();
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token === "null" || token === "undefined") {
        req.user = guestUser;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Contains id, email, name
        next();
    } catch (err) {
        req.user = guestUser;
        next();
    }
};

export default authMiddleware;
