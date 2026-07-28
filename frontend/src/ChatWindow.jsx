import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import SettingsModal from "./SettingsModal.jsx";
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
        isStreaming, setIsStreaming,
        toastMessage, setToastMessage,
        sidebarCollapsed, setSidebarCollapsed
    } = useContext(MyContext);

    const [isOpen, setIsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

                // Trigger memory updates toast notifications
                if (res.memoryEvents && res.memoryEvents.length > 0) {
                    const messages = res.memoryEvents.map(e => e.reason).join(" ");
                    setToastMessage(messages);
                    setTimeout(() => setToastMessage(""), 4000);
                }

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
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                        className="btn-sidebar-expand"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <span className="navbar-title">IntelliChat <i className="fa-solid fa-chevron-down"></i></span>
                </div>
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
                            <div className="dropDownItem" onClick={handleLogout}>
                                <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
                            </div>
                        </>
                    ) : (
                        <>
                             <div className="dropDownItem" onClick={handleGoogleLogin} style={{ fontWeight: "600", color: "var(--accent-primary)" }}>
                                 <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                                     <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                     <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                     <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                     <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                 </svg>
                                 Sign in with Google
                             </div>
                            <div className="dropDownItem" onClick={() => { setIsSettingsOpen(true); setIsOpen(false); }}>
                                <i className="fa-solid fa-gear"></i> Settings
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
            {isShareOpen && (
                <ShareModal onClose={() => setIsShareOpen(false)} threadId={currThreadId} token={token} />
            )}
        </div>
    );
}

export default ChatWindow;