import "dotenv/config";

const getGroqAPIResponse = async (messages, systemPrompt, temperature) => {
    const formattedMessages = Array.isArray(messages)
        ? messages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: messages }];

    const presets = {
        default: "You are IntelliChat, a helpful, friendly, and intelligent AI assistant. Use markdown formatting for code snippets and rich text where appropriate.",
        code: "You are a strict code specialist. Output clean, optimal code snippets only with minimal explanations.",
        explain5: "You are an educator. Explain concepts using extremely simple analogies, as if explaining to a 5-year-old child.",
        sarcastic: "You are a witty, funny, and highly sarcastic buddy. Keep responses engaging and slightly sarcastic."
    };

    const systemContent = presets[systemPrompt] || systemPrompt || presets.default;
    const tempVal = typeof temperature === "number" ? temperature : 0.7;

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
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
}

export default getGroqAPIResponse;