import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();

const PORT = 8000;

app.use(express.json());
app.use(cors());

app.use("/api",chatRoutes);

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






