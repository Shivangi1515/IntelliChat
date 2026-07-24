import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import passport from "passport";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "intellichat_jwt_secret_key_123";

// Google OAuth Authorization Route
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google OAuth Callback Route
router.get("/google/callback", 
    passport.authenticate("google", { session: false, failureRedirect: "http://localhost:5173/?error=auth_failed" }),
    (req, res) => {
        try {
            const token = jwt.sign(
                { id: req.user._id, email: req.user.email, name: req.user.name },
                JWT_SECRET,
                { expiresIn: "7d" }
            );
            res.redirect(`http://localhost:5173/?token=${token}`);
        } catch (err) {
            console.error("OAuth token generation failed:", err);
            res.redirect("http://localhost:5173/?error=token_failed");
        }
    }
);


// Register Route
router.post("/register", async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email" });
        }

        const user = new User({ email, password, name });
        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            token,
            user: { id: user._id, email: user.email, name: user.name }
        });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: "Server error during registration" });
    }
});

// Login Route
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            token,
            user: { id: user._id, email: user.email, name: user.name }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

// Get User Profile Route
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).json({ error: "Server error fetching user profile" });
    }
});

export default router;
