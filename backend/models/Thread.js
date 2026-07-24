import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
    fileType: {
        type: String,
        enum: ["image", "pdf"],
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    }
});

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    feedback: {
        type: String,
        enum: ["like", "dislike", null],
        default: null
    },
    attachments: [AttachmentSchema]
});

const ThreadSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    threadId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        default: "New Chat",
    },
    messages: [MessageSchema],
    isArchived: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isShared: {
        type: Boolean,
        default: false
    },
    shareToken: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("Thread", ThreadSchema);