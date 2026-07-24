import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Use Groq's fast Llama vision model if image attachments are present, otherwise Llama 3.3 70B
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