import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Memory from "../models/Memory.js";
import { normalizeMemoryKey } from "./helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to analyze user message and perform memory operations (create, update, delete, clear)
export const extractMemoryActions = async (userMessage, userId) => {
    try {
        const existingMemories = await Memory.find({ userId });
        
        const titlePrompt = `You are a memory manager assistant for IntelliChat.
Analyze the user's latest message to see if they want to store new personal information, update existing memories, or delete/forget something.

Existing memories for this user:
${existingMemories.map(m => `- ID: ${m._id}, Key: ${m.key}, Title: ${m.title}, Value: ${m.value}, Category: ${m.category}`).join("\n")}

Respond ONLY with a valid JSON array of memory actions, or an empty array [] if no memory update is needed. Do not include markdown headers like \`\`\`json, do not write code blocks, do not write explanations. Just return the raw JSON text.

Each action in the array must be an object with the following fields:
1. "action": "create", "update", "delete", or "clear"
2. "id": the ID of the memory if updating or deleting
3. "key": a short, normalized, lowercase identifier (e.g., "name", "favorite_language", "college", "job")
4. "title": a human-readable title (e.g., "Preferred Language", "Full Name")
5. "value": the information to remember (only for create/update)
6. "category": one of "Personal", "Coding", "Education", "Work", or "General"
7. "reason": a short, user-friendly confirmation phrase starting with a checkmark or similar (e.g. "I'll remember your name.") to show in the UI.

Guidelines:
- Only save facts, characteristics, or preferences explicitly stated by the user about themselves.
- Do NOT save general queries, coding questions, greeting messages, or conversational fluff.
- If they are correcting or updating a previously saved fact, use "update" with the corresponding memory ID.
- If they ask you to "forget" or "delete" a fact, use "delete" with the memory ID. If they want to forget all, use "clear".
- NEVER save passwords, credentials, OTPs, keys, or cards.
- If no action is needed, return [].

User message: "${userMessage}"`;

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                temperature: 0.1, // low temperature for precise JSON parsing
                messages: [
                    {
                        role: "system",
                        content: "You output raw JSON arrays of memory actions. No wrapper, no markdown blocks."
                    },
                    {
                        role: "user",
                        content: titlePrompt
                    }
                ]
            })
        };

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", options);
        if (!response.ok) {
            console.error("Groq memory extraction failed with status:", response.status);
            return [];
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // Strip markdown backticks if returned
        const cleanedJson = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        if (!cleanedJson) return [];

        const actions = JSON.parse(cleanedJson);
        const events = [];

        if (Array.isArray(actions)) {
            for (const act of actions) {
                if (act.action === "create") {
                    const key = normalizeMemoryKey(act.key);
                    const memory = await Memory.findOneAndUpdate(
                        { userId, key },
                        { title: act.title, value: act.value, category: act.category || "General" },
                        { upsert: true, new: true }
                    );
                    events.push({ title: memory.title, reason: act.reason, action: "create" });
                } else if (act.action === "update") {
                    const query = act.id ? { _id: act.id, userId } : { userId, key: act.key };
                    const memory = await Memory.findOneAndUpdate(
                        query,
                        { value: act.value, category: act.category || "General" },
                        { new: true }
                    );
                    if (memory) {
                        events.push({ title: memory.title, reason: act.reason, action: "update" });
                    }
                } else if (act.action === "delete") {
                    const query = act.id ? { _id: act.id, userId } : { userId, key: act.key };
                    const memory = await Memory.findOneAndDelete(query);
                    if (memory) {
                        events.push({ title: memory.title, reason: act.reason, action: "delete" });
                    }
                } else if (act.action === "clear") {
                    await Memory.deleteMany({ userId });
                    events.push({ title: "All memories", reason: act.reason || "Cleared all memories.", action: "clear" });
                }
            }
        }
        return events;
    } catch (err) {
        console.error("Failed to extract memory actions:", err);
        return [];
    }
};

const getGroqAPIResponse = async (messages, systemPrompt, temperature) => {
    let hasImages = false;

    const formattedMessages = Array.isArray(messages)
        ? messages.map(m => {
            // Check if this message has image attachments
            const images = m.attachments ? m.attachments.filter(a => a.fileType === "image") : [];
            if (images.length > 0) {
                hasImages = true;
                const contentArray = [
                    { type: "text", text: m.content || "Analyze the attached image(s)." }
                ];

                images.forEach(img => {
                    try {
                        const filename = img.fileUrl.split("/uploads/")[1];
                        const filepath = path.join(__dirname, "../uploads", filename);
                        if (fs.existsSync(filepath)) {
                            const base64Data = fs.readFileSync(filepath, { encoding: "base64" });
                            const ext = path.extname(filename).toLowerCase();
                            let mime = "image/jpeg";
                            if (ext === ".png") mime = "image/png";
                            else if (ext === ".webp") mime = "image/webp";

                            contentArray.push({
                                type: "image_url",
                                image_url: {
                                    url: `data:${mime};base64,${base64Data}`
                                }
                            });
                        }
                    } catch (err) {
                        console.error("Failed to read image file for base64 payload:", err);
                    }
                });

                return { role: m.role, content: contentArray };
            }
            return { role: m.role, content: m.content };
        })
        : [{ role: "user", content: messages }];

    const presets = {
        default: "You are IntelliChat, a helpful, friendly, and intelligent AI assistant. Use markdown formatting for code snippets and rich text where appropriate.",
        code: "You are a strict code specialist. Output clean, optimal code snippets only with minimal explanations.",
        explain5: "You are an educator. Explain concepts using extremely simple analogies, as if explaining to a 5-year-old child.",
        sarcastic: "You are a witty, funny, and highly sarcastic buddy. Keep responses engaging and slightly sarcastic."
    };

    const systemContent = presets[systemPrompt] || systemPrompt || presets.default;
    const tempVal = typeof temperature === "number" ? temperature : 0.7;

    // Use Groq's active vision model if image attachments are present, otherwise Llama 3.3 70B
    const model = hasImages ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model,
            temperature: tempVal,
            messages: [
                {
                    role: "system",
                    content: systemContent
                },
                ...formattedMessages
            ]
        })
    };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", options);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API returned ${response.status}: ${errText}`);
        }
        const data = await response.json();
        console.log("Groq API response content:", data.choices[0].message.content); 
        return data.choices[0].message.content; //reply

    } catch (err) {
        console.error("Error calling Groq API:", err);
        throw err;
    }
};

export default getGroqAPIResponse;