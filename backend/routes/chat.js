import express from "express";
import Thread from "../models/Thread.js";
import User from "../models/User.js";
import Memory from "../models/Memory.js";
import getGroqAPIResponse, { extractMemoryActions } from "../utils/groq.js";
import authMiddleware from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import crypto from "crypto";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// -------------------------------------------------------------
// PUBLIC UN-AUTHENTICATED ROUTES
// -------------------------------------------------------------

// Get shared thread publicly (no login required)
router.get("/share/:shareToken", async (req, res) => {
    try {
        const { shareToken } = req.params;
        const thread = await Thread.findOne({ shareToken, isShared: true });
        
        if (!thread) {
            return res.status(404).json({ error: "Shared conversation not found or disabled" });
        }
        
        res.json({
            title: thread.title,
            messages: thread.messages
        });
    } catch (err) {
        console.error("Public share fetch error:", err);
        res.status(500).json({ error: "Failed to fetch shared chat" });
    }
});

// -------------------------------------------------------------
// AUTHENTICATED ROUTES
// -------------------------------------------------------------
router.use(authMiddleware);

// Get All Threads (supports search ?q=... and archive ?archived=true)
router.get("/thread", async (req, res) => {
    try {
        const isArchived = req.query.archived === "true";
        const query = req.query.q;

        let filter = { userId: req.user.id, isArchived };

        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: "i" } },
                { "messages.content": { $regex: query, $options: "i" } }
            ];
        }

        const threads = await Thread.find(filter).sort({ isPinned: -1, updatedAt: -1 });
        res.json(threads);
    } catch (err) {
        console.error("Fetch threads error:", err);
        res.status(500).json({ error: "Failed to fetch threads" });
    }
});

// Get Thread by ID
router.get("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    try {
        const thread = await Thread.findOne({ threadId, userId: req.user.id });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(thread.messages);
    } catch (err) {
        console.error("Fetch thread detail error:", err);
        res.status(500).json({ error: "Failed to fetch chat" });
    }
});

// Delete All Threads
router.delete("/thread", async (req, res) => {
    try {
        await Thread.deleteMany({ userId: req.user.id });
        res.status(200).json({ success: "All threads successfully deleted" });
    } catch (err) {
        console.error("Bulk delete error:", err);
        res.status(500).json({ error: "Failed to delete all threads" });
    }
});

// Delete Thread
router.delete("/thread/:threadId", async (req, res) => {
    try {
        const { threadId } = req.params;
        const deletedThread = await Thread.findOneAndDelete({ threadId, userId: req.user.id });

        if (!deletedThread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        res.status(200).json({ success: "Thread successfully deleted" });
    } catch (err) {
        console.error("Delete thread error:", err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

// Toggle Archive Thread
router.put("/thread/:threadId/archive", async (req, res) => {
    const { threadId } = req.params;
    const { isArchived } = req.body;
    try {
        const thread = await Thread.findOneAndUpdate(
            { threadId, userId: req.user.id },
            { isArchived: !!isArchived, updatedAt: new Date() },
            { new: true }
        );

        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        res.json(thread);
    } catch (err) {
        console.error("Archive toggle error:", err);
        res.status(500).json({ error: "Failed to toggle archive status" });
    }
});

// Toggle Pin Thread
router.put("/thread/:threadId/pin", async (req, res) => {
    const { threadId } = req.params;
    const { isPinned } = req.body;
    try {
        const thread = await Thread.findOneAndUpdate(
            { threadId, userId: req.user.id },
            { isPinned: !!isPinned, updatedAt: new Date() },
            { new: true }
        );

        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        res.json(thread);
    } catch (err) {
        console.error("Pin toggle error:", err);
        res.status(500).json({ error: "Failed to toggle pin status" });
    }
});

// Get Share Link Status
router.get("/thread/:threadId/share", async (req, res) => {
    const { threadId } = req.params;
    try {
        const thread = await Thread.findOne({ threadId, userId: req.user.id });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json({ isShared: thread.isShared, shareToken: thread.shareToken });
    } catch (err) {
        console.error("Get share status error:", err);
        res.status(500).json({ error: "Failed to get sharing status" });
    }
});

// Toggle Share Link (generates/invalidates token)
router.put("/thread/:threadId/share", async (req, res) => {
    const { threadId } = req.params;
    const { isShared } = req.body;
    try {
        const shareToken = isShared ? crypto.randomBytes(16).toString("hex") : null;
        const thread = await Thread.findOneAndUpdate(
            { threadId, userId: req.user.id },
            { isShared: !!isShared, shareToken, updatedAt: new Date() },
            { new: true }
        );

        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        res.json({ isShared: thread.isShared, shareToken: thread.shareToken });
    } catch (err) {
        console.error("Share toggle error:", err);
        res.status(500).json({ error: "Failed to toggle sharing" });
    }
});

// Save Message Feedback (Likes/Dislikes)
router.put("/thread/:threadId/feedback", async (req, res) => {
    const { threadId } = req.params;
    const { messageIndex, feedback } = req.body;
    
    if (typeof messageIndex !== "number" || !["like", "dislike", null].includes(feedback)) {
        return res.status(400).json({ error: "Invalid feedback payload" });
    }

    try {
        const thread = await Thread.findOne({ threadId, userId: req.user.id });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        if (!thread.messages[messageIndex]) {
            return res.status(404).json({ error: "Message not found" });
        }

        thread.messages[messageIndex].feedback = feedback;
        await thread.save();
        res.json({ success: "Feedback updated", messages: thread.messages });
    } catch (err) {
        console.error("Feedback error:", err);
        res.status(500).json({ error: "Failed to save feedback" });
    }
});

// Edit Message / Prompt & Regenerate
router.put("/thread/:threadId/edit", async (req, res) => {
    const { threadId } = req.params;
    const { messageIndex, newContent, systemPrompt, temperature } = req.body;

    if (typeof messageIndex !== "number" || !newContent) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const thread = await Thread.findOne({ threadId, userId: req.user.id });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        if (!thread.messages[messageIndex] || thread.messages[messageIndex].role !== "user") {
            return res.status(400).json({ error: "Invalid message index or role" });
        }

        // Keep all attachments if they exist on the edited message
        const attachments = thread.messages[messageIndex].attachments || [];

        // 1. Truncate everything after this message
        thread.messages = thread.messages.slice(0, messageIndex);

        // 2. Add the modified user message
        thread.messages.push({
            role: "user",
            content: newContent,
            isEdited: true,
            attachments
        });

        // Handle Memory System on Edit
        let memoryEvents = [];
        let finalSystemPrompt = systemPrompt;

        if (req.user.id !== "000000000000000000000000") {
            const userProfile = await User.findById(req.user.id);
            if (userProfile && userProfile.memoryEnabled) {
                memoryEvents = await extractMemoryActions(newContent, req.user.id);
                const memories = await Memory.find({ userId: req.user.id });
                if (memories.length > 0) {
                    const memoryText = memories.map(m => `* ${m.title}: ${m.value}`).join("\n");
                    const memoryInstructions = `\n\nYou know the following about the user:\n${memoryText}\n\nUse these memories naturally when they improve your responses. Do not mention memories unless they are relevant.`;
                    
                    const presets = {
                        default: "You are IntelliChat, a helpful, friendly, and intelligent AI assistant. Use markdown formatting for code snippets and rich text where appropriate.",
                        code: "You are a strict code specialist. Output clean, optimal code snippets only with minimal explanations.",
                        explain5: "You are an educator. Explain concepts using extremely simple analogies, as if explaining to a 5-year-old child.",
                        sarcastic: "You are a witty, funny, and highly sarcastic buddy. Keep responses engaging and slightly sarcastic."
                    };
                    const resolvedPrompt = presets[systemPrompt] || systemPrompt || presets.default;
                    finalSystemPrompt = resolvedPrompt + memoryInstructions;
                }
            }
        }

        // 3. Generate new assistant response
        const assistantReply = await getGroqAPIResponse(thread.messages, finalSystemPrompt, temperature);
        thread.messages.push({ role: "assistant", content: assistantReply });
        thread.updatedAt = new Date();

        await thread.save();
        res.json({ reply: assistantReply, messages: thread.messages, memoryEvents });
    } catch (err) {
        console.error("Edit message error:", err);
        res.status(500).json({ error: "Failed to edit prompt and regenerate" });
    }
});

// Update single message content (for Stop Generating partial text saving)
router.put("/thread/:threadId/message", async (req, res) => {
    const { threadId } = req.params;
    const { messageIndex, content } = req.body;

    if (typeof messageIndex !== "number" || typeof content !== "string") {
        return res.status(400).json({ error: "Invalid parameters" });
    }

    try {
        const thread = await Thread.findOne({ threadId, userId: req.user.id });
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }

        if (!thread.messages[messageIndex]) {
            return res.status(404).json({ error: "Message not found" });
        }

        thread.messages[messageIndex].content = content;
        await thread.save();
        res.json({ success: "Message updated", messages: thread.messages });
    } catch (err) {
        console.error("Stop stream partial save error:", err);
        res.status(500).json({ error: "Failed to save partial message content" });
    }
});

// File Upload Route
router.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
    }

    try {
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "image";
        
        res.json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "File upload failed" });
    }
});

// Create Chat Message / Continue Chat
router.post("/chat", async (req, res) => {
    const { threadId, message, attachments, systemPrompt, temperature } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({ error: "missing required fields" });
    }

    try {
        let thread = await Thread.findOne({ threadId, userId: req.user.id });

        if (!thread) {
            // Auto-generate title using Groq
            let generatedTitle = message.substring(0, 40) + (message.length > 40 ? "..." : "");
            try {
                const titlePrompt = `Generate a very short, catchy 3 to 5 words title for a conversation starting with this user message. Respond ONLY with the title. Do not include quote marks, periods, or extra words. User message: "${message}"`;
                const aiTitle = await getGroqAPIResponse([{ role: "user", content: titlePrompt }], "You are a helpful assistant.", 0.5);
                if (aiTitle && aiTitle.trim()) {
                    generatedTitle = aiTitle.trim().replace(/^["'“”‘]/g, "").replace(/["'“”’]$/g, ""); // strip quotes
                }
            } catch (titleErr) {
                console.error("Auto-generated title generation failed, using fallback:", titleErr);
            }

            // Create a new thread in Db
            thread = new Thread({
                userId: req.user.id,
                threadId,
                title: generatedTitle,
                messages: [{ role: "user", content: message, attachments: attachments || [] }]
            });
        } else {
            thread.messages.push({ role: "user", content: message, attachments: attachments || [] });
        }

        // Handle Memory System
        let memoryEvents = [];
        let finalSystemPrompt = systemPrompt;

        if (req.user.id !== "000000000000000000000000") {
            const userProfile = await User.findById(req.user.id);
            if (userProfile && userProfile.memoryEnabled) {
                // Analyze prompt for updates/insertions/deletions
                memoryEvents = await extractMemoryActions(message, req.user.id);

                // Fetch updated memories
                const memories = await Memory.find({ userId: req.user.id });
                if (memories.length > 0) {
                    const memoryText = memories.map(m => `* ${m.title}: ${m.value}`).join("\n");
                    const memoryInstructions = `\n\nYou know the following about the user:\n${memoryText}\n\nUse these memories naturally when they improve your responses. Do not mention memories unless they are relevant.`;
                    
                    const presets = {
                        default: "You are IntelliChat, a helpful, friendly, and intelligent AI assistant. Use markdown formatting for code snippets and rich text where appropriate.",
                        code: "You are a strict code specialist. Output clean, optimal code snippets only with minimal explanations.",
                        explain5: "You are an educator. Explain concepts using extremely simple analogies, as if explaining to a 5-year-old child.",
                        sarcastic: "You are a witty, funny, and highly sarcastic buddy. Keep responses engaging and slightly sarcastic."
                    };
                    const resolvedPrompt = presets[systemPrompt] || systemPrompt || presets.default;
                    finalSystemPrompt = resolvedPrompt + memoryInstructions;
                }
            }
        }

        // Pass the updated messages history to the Groq API helper
        const assistantReply = await getGroqAPIResponse(thread.messages, finalSystemPrompt, temperature);

        thread.messages.push({ role: "assistant", content: assistantReply });
        thread.updatedAt = new Date();

        await thread.save();
        res.json({ reply: assistantReply, messages: thread.messages, memoryEvents });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ error: "something went wrong" });
    }
});

export default router;