import "./Chat.css";
import React, { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { BeatLoader } from "react-spinners";

function Chat() {
    const {
        token,
        newChat,
        prevChats,
        setPrevChats,
        reply,
        setReply,
        loading,
        setLoading,
        systemPrompt,
        temperature,
        setIsStreaming,
        highlightedMessageIndex,
        setHighlightedMessageIndex,
        currThreadId
    } = useContext(MyContext);

    const [latestReply, setLatestReply] = useState(null);
    const [toastMessage, setToastMessage] = useState("");
    
    // Edit prompt states
    const [editingIndex, setEditingIndex] = useState(null);
    const [editText, setEditText] = useState("");

    const messagesEndRef = useRef(null);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Trigger scroll when messages change, while typing, or when loading changes
    useEffect(() => {
        scrollToBottom();
    }, [prevChats, latestReply, loading]);

    // Handle highlighted search hits scroll
    useEffect(() => {
        if (highlightedMessageIndex !== null && prevChats && prevChats.length > 0) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`msg-${highlightedMessageIndex}`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                    element.classList.add("search-highlight");
                    setTimeout(() => {
                        element.classList.remove("search-highlight");
                    }, 2000);
                    setHighlightedMessageIndex(null);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [highlightedMessageIndex, prevChats]);

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
        }, 15);

        return () => clearInterval(interval);
    }, [reply]);

    const handleCopyMessage = (text) => {
        navigator.clipboard.writeText(text);
        setToastMessage("Copied to clipboard");
        setTimeout(() => setToastMessage(""), 2000);
    };

    const handleSaveFeedback = async (messageIdx, feedbackVal) => {
        const updatedChats = [...prevChats];
        updatedChats[messageIdx].feedback = feedbackVal;
        setPrevChats(updatedChats);

        try {
            await fetch(`http://localhost:8000/api/thread/${currThreadId}/feedback`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ messageIndex: messageIdx, feedback: feedbackVal })
            });
        } catch (err) {
            console.error("Save feedback error:", err);
        }
    };

    const handleStartEdit = (idx, currentContent) => {
        setEditingIndex(idx);
        setEditText(currentContent);
    };

    const handleSaveEdit = async (messageIdx) => {
        const newContent = editText.trim();
        if (!newContent) return;

        setEditingIndex(null);
        setLoading(true);
        setIsStreaming(true);

        try {
            const response = await fetch(`http://localhost:8000/api/thread/${currThreadId}/edit`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    messageIndex: messageIdx,
                    newContent,
                    systemPrompt,
                    temperature
                })
            });
            const res = await response.json();
            if (response.ok) {
                setPrevChats(res.messages);
                setReply(res.reply);
            }
        } catch (err) {
            console.error("Edit request failed:", err);
        } finally {
            setLoading(false);
            setIsStreaming(false);
        }
    };

    // Custom renderer for code blocks
    const MarkdownComponents = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeText = String(children).replace(/\n$/, '');
            
            if (inline) {
                return <code className={className} {...props}>{children}</code>;
            }
            
            const language = match ? match[1] : 'text';
            
            return (
                <div className="code-block-wrapper">
                    <div className="code-block-header">
                        <span className="code-block-lang">{language.toUpperCase()}</span>
                        <button className="btn-copy-code" onClick={() => handleCopyMessage(codeText)}>
                            <i className="fa-solid fa-copy"></i> Copy
                        </button>
                    </div>
                    <pre className={className}>
                        <code className={className} {...props}>{children}</code>
                    </pre>
                </div>
            );
        }
    };

    return (
        <div className="chat-container">
            {toastMessage && (
                <div className="custom-toast">
                    <i className="fa-solid fa-circle-check"></i> {toastMessage}
                </div>
            )}

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
                            <div 
                                className={isUser ? "userDiv" : "gptDiv"} 
                                key={idx}
                                id={`msg-${idx}`}
                            >
                                <div className="avatar">
                                    {isUser ? (
                                        <i className="fa-solid fa-user"></i>
                                    ) : (
                                        <img src="src/assets/IntelliChatLogo.png" alt="AI logo" />
                                    )}
                                </div>
                                <div className="message-content">
                                    {isUser ? (
                                        <div className="user-message-wrapper">
                                            {editingIndex === idx ? (
                                                <div className="edit-prompt-container">
                                                    <textarea 
                                                        value={editText} 
                                                        onChange={(e) => setEditText(e.target.value)} 
                                                        className="edit-prompt-textarea"
                                                    />
                                                    <div className="edit-prompt-actions">
                                                        <button className="btn-edit-cancel" onClick={() => setEditingIndex(null)}>Cancel</button>
                                                        <button className="btn-edit-submit" onClick={() => handleSaveEdit(idx)}>Save & Submit</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="userMessage">{chat.content}</p>
                                                    
                                                    {/* Display Attachments */}
                                                    {chat.attachments && chat.attachments.length > 0 && (
                                                        <div className="message-attachments-display">
                                                            {chat.attachments.map((file, fileIdx) => (
                                                                <div key={fileIdx} className="message-attachment-card">
                                                                    {file.fileType === "image" ? (
                                                                        <a href={file.fileUrl} target="_blank" rel="noreferrer">
                                                                            <img src={file.fileUrl} alt="attachment" className="attached-image" />
                                                                        </a>
                                                                    ) : (
                                                                        <a href={file.fileUrl} target="_blank" rel="noreferrer" className="attached-pdf-link">
                                                                            <i className="fa-solid fa-file-pdf"></i>
                                                                            <div className="pdf-details">
                                                                                <span className="pdf-name">{file.fileName}</span>
                                                                                <span className="pdf-size">{(file.fileSize / 1024).toFixed(1)} KB</span>
                                                                            </div>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="user-message-actions">
                                                        {chat.isEdited && <span className="edited-label">Edited</span>}
                                                        <button className="btn-edit-prompt" onClick={() => handleStartEdit(idx, chat.content)}>
                                                            <i className="fa-solid fa-pen"></i> Edit
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="gpt-message-wrapper">
                                            <div className="gptMessage">
                                                {isLastMessage && latestReply !== null ? (
                                                    <ReactMarkdown components={MarkdownComponents} rehypePlugins={[rehypeHighlight]}>{latestReply}</ReactMarkdown>
                                                ) : (
                                                    <ReactMarkdown components={MarkdownComponents} rehypePlugins={[rehypeHighlight]}>{chat.content}</ReactMarkdown>
                                                )}
                                            </div>

                                            {/* AI Feedback / Likes / Copy buttons */}
                                            {token && (
                                                <div className="message-feedbacks">
                                                    <button 
                                                        className={`btn-feedback ${chat.feedback === 'like' ? 'active' : ''}`}
                                                        onClick={() => handleSaveFeedback(idx, chat.feedback === 'like' ? null : 'like')}
                                                        title="Like Response"
                                                    >
                                                        <i className="fa-regular fa-thumbs-up"></i>
                                                    </button>
                                                    <button 
                                                        className={`btn-feedback ${chat.feedback === 'dislike' ? 'active' : ''}`}
                                                        onClick={() => handleSaveFeedback(idx, chat.feedback === 'dislike' ? null : 'dislike')}
                                                        title="Dislike Response"
                                                    >
                                                        <i className="fa-regular fa-thumbs-down"></i>
                                                    </button>
                                                    <button 
                                                        className="btn-feedback"
                                                        onClick={() => handleCopyMessage(chat.content)}
                                                        title="Copy Response"
                                                    >
                                                        <i className="fa-solid fa-copy"></i>
                                                    </button>
                                                </div>
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