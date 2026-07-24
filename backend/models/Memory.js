import mongoose from "mongoose";

const memorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: "General",
        enum: ["Personal", "Coding", "Education", "Work", "General"]
    }
}, { timestamps: true });

// Prevent duplicate keys per user
memorySchema.index({ userId: 1, key: 1 }, { unique: true });

export default mongoose.model("Memory", memorySchema);
