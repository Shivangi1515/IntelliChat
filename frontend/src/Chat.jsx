import "./Chat.css";
import React, { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { BeatLoader } from "react-spinners";

function Chat() {
    const { newChat, prevChats, reply, loading } = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);
    const messagesEndRef = useRef(null);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Trigger scroll when messages change, while typing, or when loading changes
    useEffect(() => {
        scrollToBottom();
    }, [prevChats, latestReply, loading]);

    // Typewriter effect for new replies
    useEffect(() => {
        if (!reply) {
            setLatestReply(null);
            return;
        }

        const words = reply.split(" ");
        let idx = 0;
        setLatestReply("");

        const interval = setInterval(() => {
            setLatestReply(words.slice(0, idx + 1).join(" "));
            idx++;
            if (idx >= words.length) {
                clearInterval(interval);
            }
        }, 15); // Slightly faster for smoother UX

        return () => clearInterval(interval);
    }, [reply]);

    return (
        <div className="chat-container">
            {newChat && (
                <div className="welcome-container">
                    <h1>How can I help you today?</h1>
                    <p>Ask questions, explore ideas, or write code with IntelliChat.</p>
                </div>
            )}
            <div className="chats">
                {
                    prevChats?.map((chat, idx) => {
                        const isUser = chat.role === "user";
                        const isLastMessage = idx === prevChats.length - 1;
                        
                        return (
                            <div className={isUser ? "userDiv" : "gptDiv"} key={idx}>
                                <div className="avatar">
                                    {isUser ? (
                                        <i className="fa-solid fa-user"></i>
                                    ) : (
                                        <img src="src/assets/IntelliChatLogo.png" alt="AI logo" />
                                    )}
                                </div>
                                <div className="message-content">
                                    {isUser ? (
                                        <p className="userMessage">{chat.content}</p>
                                    ) : (
                                        <div className="gptMessage">
                                            {isLastMessage && latestReply !== null ? (
                                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{latestReply}</ReactMarkdown>
                                            ) : (
                                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{chat.content}</ReactMarkdown>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                }

                {/* Inline Loading State */}
                {loading && (
                    <div className="gptDiv loading-state">
                        <div className="avatar">
                            <img src="src/assets/IntelliChatLogo.png" alt="AI logo" />
                        </div>
                        <div className="message-content">
                            <div className="gptMessage loading-bubbles">
                                <BeatLoader color="rgba(255, 255, 255, 0.4)" size={8} margin={3} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}

export default Chat;