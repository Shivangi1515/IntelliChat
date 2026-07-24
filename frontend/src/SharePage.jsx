import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import "./Chat.css"; // Reuse markdown code styles
import { BeatLoader } from "react-spinners";

function SharePage({ shareToken }) {
    const [title, setTitle] = useState("Shared Chat");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchSharedChat = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/share/${shareToken}`);
                const data = await response.json();
                if (response.ok) {
                    setTitle(data.title);
                    setMessages(data.messages);
                } else {
                    setError(data.error || "Shared conversation not found");
                }
            } catch (err) {
                console.error("Fetch shared chat failed:", err);
                setError("Connection failed. Could not load shared chat.");
            } finally {
                setLoading(false);
            }
        };

        fetchSharedChat();
    }, [shareToken]);

    const handleCopyCode = (text) => {
        navigator.clipboard.writeText(text);
        alert("Code block copied to clipboard");
    };

    // Custom code renderer for shared page
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
                        <button className="btn-copy-code" onClick={() => handleCopyCode(codeText)}>
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

    if (loading) {
        return (
            <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
                <BeatLoader color="rgba(255, 255, 255, 0.4)" size={12} />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", gap: "1rem", color: "var(--text-secondary)" }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: "3rem", color: "#ef4444" }}></i>
                <h3>{error}</h3>
                <button 
                    onClick={() => window.location.href = "/"}
                    style={{ background: "var(--accent-primary)", border: "none", color: "white", padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "600" }}
                >
                    Back to IntelliChat
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "var(--bg-main)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", borderBottom: "1px solid var(--border-color)", background: "var(--bg-sidebar)", height: "64px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <img src="/src/assets/IntelliChatLogo.png" alt="logo" style={{ height: "30px", width: "30px", borderRadius: "var(--radius-sm)", background: "white", padding: "2px" }} />
                    <span style={{ fontWeight: "700", fontSize: "1.1rem", background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IntelliChat Share</span>
                </div>
                <button 
                    onClick={() => window.location.href = "/"}
                    style={{ background: "var(--accent-primary)", border: "none", color: "white", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
                >
                    Create Your Own Chat
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1.5rem" }}>
                <div style={{ width: "100%", maxWidth: "800px", marginBottom: "2rem" }}>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.5rem" }}>{title}</h2>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Read-only snapshot of this conversation.</p>
                </div>

                <div className="chats" style={{ width: "100%", maxWidth: "800px" }}>
                    {messages.map((chat, idx) => {
                        const isUser = chat.role === "user";
                        return (
                            <div className={isUser ? "userDiv" : "gptDiv"} key={idx} style={{ marginBottom: "1.5rem" }}>
                                <div className="avatar">
                                    {isUser ? (
                                        <i className="fa-solid fa-user"></i>
                                    ) : (
                                        <img src="/src/assets/IntelliChatLogo.png" alt="AI logo" />
                                    )}
                                </div>
                                <div className="message-content">
                                    {isUser ? (
                                        <div className="user-message-wrapper">
                                            <p className="userMessage">{chat.content}</p>
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
                                        </div>
                                    ) : (
                                        <div className="gptMessage">
                                            <ReactMarkdown components={MarkdownComponents} rehypePlugins={[rehypeHighlight]}>{chat.content}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default SharePage;
