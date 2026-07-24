import "dotenv/config";

const getGroqAPIResponse = async (messages) => {
    const formattedMessages = Array.isArray(messages)
        ? messages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: messages }];

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are IntelliChat, a helpful, friendly, and intelligent AI assistant. Use markdown formatting for code snippets and rich text where appropriate."
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