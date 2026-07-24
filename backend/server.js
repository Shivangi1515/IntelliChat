import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import passport from "./utils/passport.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 8000;

// Create uploads directory if it does not exist
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
}

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// Serve uploads statically
app.use("/uploads", express.static(uploadsPath));

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connection established successfully");
    } catch (err) {
        console.error("Failed to connect to database:", err);
        process.exit(1);
    }
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});






