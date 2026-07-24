import express from "express";
import Memory from "../models/Memory.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all endpoints
router.use(authMiddleware);

// GET /api/memory - Get all memories for logged-in user
router.get("/", async (req, res) => {
    try {
        const memories = await Memory.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.json(memories);
    } catch (err) {
        console.error("Fetch memories error:", err);
        res.status(500).json({ error: "Failed to fetch memories" });
    }
});

// POST /api/memory - Create a new memory manually
router.post("/", async (req, res) => {
    const { title, value, category } = req.body;
    if (!title || !value) {
        return res.status(400).json({ error: "Title and Value are required fields" });
    }

    const key = title.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");

    try {
        // Check for duplicates or update existing
        const existing = await Memory.findOne({ userId: req.user.id, key });
        if (existing) {
            existing.value = value;
            if (category) existing.category = category;
            await existing.save();
            return res.json(existing);
        }

        const memory = new Memory({
            userId: req.user.id,
            key,
            title: title.trim(),
            value: value.trim(),
            category: category || "General"
        });
        await memory.save();
        res.status(201).json(memory);
    } catch (err) {
        console.error("Create memory error:", err);
        res.status(500).json({ error: "Failed to create memory" });
    }
});

// PUT /api/memory/:id - Update an existing memory manually
router.put("/:id", async (req, res) => {
    const { title, value, category } = req.body;
    try {
        const memory = await Memory.findOne({ _id: req.params.id, userId: req.user.id });
        if (!memory) {
            return res.status(404).json({ error: "Memory not found" });
        }

        if (title) {
            memory.title = title.trim();
            memory.key = title.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
        }
        if (value) {
            memory.value = value.trim();
        }
        if (category) {
            memory.category = category;
        }

        await memory.save();
        res.json(memory);
    } catch (err) {
        console.error("Update memory error:", err);
        res.status(500).json({ error: "Failed to update memory" });
    }
});

// DELETE /api/memory/:id - Delete a single memory
router.delete("/:id", async (req, res) => {
    try {
        const result = await Memory.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!result) {
            return res.status(404).json({ error: "Memory not found" });
        }
        res.json({ success: "Memory deleted successfully" });
    } catch (err) {
        console.error("Delete memory error:", err);
        res.status(500).json({ error: "Failed to delete memory" });
    }
});

// DELETE /api/memory - Clear all memories for user
router.delete("/", async (req, res) => {
    try {
        await Memory.deleteMany({ userId: req.user.id });
        res.json({ success: "All memories cleared successfully" });
    } catch (err) {
        console.error("Clear memories error:", err);
        res.status(500).json({ error: "Failed to clear memories" });
    }
});

// PUT /api/memory/toggle - Toggle memory collection on/off
router.put("/toggle", async (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "Enabled field must be a boolean" });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { memoryEnabled: enabled },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Toggle memory error:", err);
        res.status(500).json({ error: "Failed to toggle memory collection status" });
    }
});

export default router;
