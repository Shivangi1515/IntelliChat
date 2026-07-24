import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import SettingsModal from "./SettingsModal.jsx";
import UpgradeModal from "./UpgradeModal.jsx";
import { MyContext } from "./MyContext.jsx";
import React, { useContext, useState, useRef } from "react";
import ShareModal from "./ShareModal.jsx";

function ChatWindow() {
    const {
        token, setToken,
        user, setUser,
        prompt, setPrompt,
        setReply,
        currThreadId,
        prevChats,
        setPrevChats,
        setNewChat,
        setAllThreads,
        loading, setLoading,
        systemPrompt,
        temperature,
        isStreaming, setIsStreaming
    } = useContext(MyContext);

    const [isOpen, setIsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // File attachments states
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // AbortController ref for canceling generation
    const abortControllerRef = useRef(null);

    const getReply = async () => {
        const messageText = prompt.trim();
        // Allow sending if there is text OR if there are file attachments
        if ((!messageText && attachedFiles.length === 0) || loading) return;

        // Stage user message immediately
        setPrevChats(prev => [...prev, { role: "user", content: messageText, attachments: attachedFiles }]);
        const currentAttachments = [...attachedFiles];
        
        setPrompt("");
        setAttachedFiles([]);
        setLoading(true);
        setIsStreaming(true);
        setNewChat(false);

        abortControllerRef.current = new AbortController();

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                message: messageText || "Sent an attachment",
                threadId: currThreadId,
                attachments: currentAttachments,
                systemPrompt,
                temperature
            }),
            signal: abortControllerRef.current.signal
        };

        try {
            const response = await fetch("http://localhost:8000/api/chat", options);
            const res = await response.json();
            
            if (res.reply) {
                // Append assistant reply immediately
                setPrevChats(prev => [...prev, { role: "assistant", content: res.reply }]);
                setReply(res.reply);

                // Update thread list
                const threadResponse = await fetch("http://localhost:8000/api/thread", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const threadList = await threadResponse.json();
                if (threadResponse.ok) {
                    setAllThreads(threadList);
                }
            }
        } catch (err) {
            if (err.name === "AbortError") {
                console.log("Generation aborted by user.");
                // Fetch the latest state of the thread to synchronize DB
                try {
                    const syncResponse = await fetch(`http://localhost:8000/api/thread/${currThreadId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    if (syncResponse.ok) {
                        const messages = await syncResponse.json();
                        setPrevChats(messages);
                    }
                } catch (syncErr) {
                    console.error("Aborted sync error:", syncErr);
                }
                return;
            }
            console.error("Error getting chat response:", err);
            setPrevChats(prev => [...prev, { role: "assistant", content: "Oops! Something went wrong while generating response." }]);
        } finally {
            setLoading(false);
            setIsStreaming(false);
        }
    };

    const handleStopGenerating = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setLoading(false);
        setIsStreaming(false);
    };

    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    };

    const handleLogout = () => {
        localStorage.removeItem("intellichat_token");
        setToken(null);
        setUser(null);
        window.location.reload();
    };

    const handleGoogleLogin = () => {
        window.location.href = "http://localhost:8000/api/auth/google";
    };

    const startSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = "en-US";
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setPrompt(prev => prev + (prev ? " " : "") + transcript);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    // File upload triggers
    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        
        try {
            const response = await fetch("http://localhost:8000/api/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const res = await response.json();
            if (response.ok) {
                setAttachedFiles(prev => [...prev, res]);
            } else {
                alert("File upload failed: " + res.error);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("File upload connection failed.");
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} exceeds the 10MB size limit.`);
                return;
            }
            uploadFile(file);
        });
    };

    const removeAttachedFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (["jpg", "jpeg", "png", "webp", "pdf"].includes(ext)) {
                if (file.size > 10 * 1024 * 1024) {
                    alert(`File ${file.name} exceeds the 10MB size limit.`);
                    return;
                }
                uploadFile(file);
            } else {
                alert("Unsupported file format. Please upload JPG, PNG, WEBP, or PDF files.");
            }
        });
    };

    return (
        <div 
            className="chatWindow"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div className="drag-overlay">
                    <div className="drag-overlay-card">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <p>Drop your images or PDFs here</p>
                    </div>
                </div>
            )}

            <div className="navbar">
                <span className="navbar-title">IntelliChat <i className="fa-solid fa-chevron-down"></i></span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {token && prevChats.length > 0 && (
                        <button 
                            className="btn-share-nav" 
                            title="Share Conversation" 
                            onClick={() => setIsShareOpen(true)}
                        >
                            <i className="fa-solid fa-share-nodes"></i> Share
                        </button>
                    )}
                    <div className="userIconDiv" onClick={handleProfileClick}>
                        <span className="userIcon">
                            <i className="fa-solid fa-user"></i>
                        </span>
                    </div>
                </div>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    {token ? (
                        <>
                            <div className="dropDownItem" onClick={() => { setIsSettingsOpen(true); setIsOpen(false); }}>
                                <i className="fa-solid fa-gear"></i> Settings
                            </div>
                            <div className="dropDownItem" onClick={() => { setIsUpgradeOpen(true); setIsOpen(false); }}>
                                <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan
                            </div>
                            <div className="dropDownItem" onClick={handleLogout}>
                                <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="dropDownItem" onClick={handleGoogleLogin} style={{ fontWeight: "600", color: "var(--accent-primary)" }}>
                                <i className="fa-brands fa-google"></i> Sign in with Google
                            </div>
                            <div className="dropDownItem" onClick={() => { setIsSettingsOpen(true); setIsOpen(false); }}>
                                <i className="fa-solid fa-gear"></i> Settings
                            </div>
                            <div className="dropDownItem" onClick={() => { setIsUpgradeOpen(true); setIsOpen(false); }}>
                                <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan
                            </div>
                        </>
                    )}
                </div>
            }
            
            <Chat />
            
            <div className="chatInput">
                {/* File Previews Container */}
                {attachedFiles.length > 0 && (
                    <div className="file-previews-container">
                        {attachedFiles.map((file, idx) => (
                            <div key={idx} className="file-preview-card">
                                {file.fileType === "image" ? (
                                    <img src={file.fileUrl} alt="preview" className="preview-image" />
                                ) : (
                                    <div className="preview-pdf-icon">
                                        <i className="fa-solid fa-file-pdf"></i>
                                    </div>
                                )}
                                <div className="preview-file-details">
                                    <span className="preview-filename">{file.fileName}</span>
                                    <span className="preview-filesize">{(file.fileSize / 1024).toFixed(1)} KB</span>
                                </div>
                                <button className="btn-remove-file" onClick={() => removeAttachedFile(idx)}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="inputBox">
                    {/* Upload Paperclip Icon */}
                    {token && (
                        <label className="btn-upload" title="Attach file (Images/PDF)">
                            <input 
                                type="file" 
                                accept=".jpg,.jpeg,.png,.webp,.pdf" 
                                multiple 
                                onChange={handleFileSelect} 
                                style={{ display: "none" }} 
                            />
                            <i className="fa-solid fa-paperclip"></i>
                        </label>
                    )}

                    <input placeholder="Ask anything..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' ? getReply() : ''}
                    />

                    <div className={`btn-mic ${isListening ? 'listening' : ''}`} onClick={startSpeechRecognition}>
                        <i className="fa-solid fa-microphone"></i>
                    </div>

                    {/* Conditional Stop/Submit Button */}
                    {isStreaming ? (
                        <div id="stop-generation" onClick={handleStopGenerating} title="Stop Generating">
                            <i className="fa-solid fa-stop"></i>
                        </div>
                    ) : (
                        <div id="submit" onClick={getReply}>
                            <i className="fa-solid fa-paper-plane"></i>
                        </div>
                    )}
                </div>
                <p className="info">
                    IntelliChat can make mistakes. Check important info. See Cookie Preferences.
                </p>
            </div>

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} user={user} />
            )}
            {isUpgradeOpen && (
                <UpgradeModal onClose={() => setIsUpgradeOpen(false)} />
            )}
            {isShareOpen && (
                <ShareModal onClose={() => setIsShareOpen(false)} threadId={currThreadId} token={token} />
            )}
        </div>
    );
}

export default ChatWindow;