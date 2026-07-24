import React, { useState, useEffect, useContext } from "react";
import "./SettingsModal.css";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

function SettingsModal({ onClose, user }) {
    const {
        token,
        setUser,
        setPrevChats,
        setAllThreads,
        setNewChat,
        setCurrThreadId,
        setPrompt,
        setReply,
        systemPrompt,
        setSystemPrompt,
        temperature,
        setTemperature
    } = useContext(MyContext);

    const [activeTab, setActiveTab] = useState("general");
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("intellichat_theme") || "dark";
    });

    // Chat History Deletion States
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const [showSuccessClear, setShowSuccessClear] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Memory States
    const [memories, setMemories] = useState([]);
    const [loadingMemories, setLoadingMemories] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [memoryEnabled, setMemoryEnabled] = useState(user?.memoryEnabled ?? true);
    
    // Memory Edit States
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editValue, setEditValue] = useState("");
    const [editCategory, setEditCategory] = useState("General");
    
    // Clear Memory States
    const [showConfirmClearMemory, setShowConfirmClearMemory] = useState(false);
    const [showSuccessClearMemory, setShowSuccessClearMemory] = useState(false);
    const [isClearingMemory, setIsClearingMemory] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("intellichat_theme", theme);
    }, [theme]);

    // Fetch memories when switching to memory tab
    useEffect(() => {
        if (activeTab === "memory" && token) {
            fetchMemories();
        }
    }, [activeTab]);

    const fetchMemories = async () => {
        setLoadingMemories(true);
        try {
            const response = await fetch("http://localhost:8000/api/memory", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMemories(data);
            }
        } catch (err) {
            console.error("Failed to fetch memories:", err);
        } finally {
            setLoadingMemories(false);
        }
    };

    const handleThemeToggle = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const handlePromptChange = (e) => {
        const value = e.target.value;
        setSystemPrompt(value);
        localStorage.setItem("intellichat_system_prompt", value);
    };

    const handleTemperatureChange = (e) => {
        const value = parseFloat(e.target.value);
        setTemperature(value);
        localStorage.setItem("intellichat_temperature", value.toString());
    };

    const executeClearHistory = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch("http://localhost:8000/api/thread", {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setAllThreads([]);
                setPrevChats([]);
                setPrompt("");
                setReply(null);
                setNewChat(true);
                setCurrThreadId(uuidv1());
                
                setShowSuccessClear(true);
                setTimeout(() => {
                    setShowSuccessClear(false);
                    setShowConfirmClear(false);
                    onClose();
                }, 1500);
            } else {
                alert("Failed to clear chat history.");
                setIsDeleting(false);
            }
        } catch (err) {
            console.error("Error clearing chat history:", err);
            alert("Connection error. Could not clear history.");
            setIsDeleting(false);
        }
    };

    // Toggle Memory on/off
    const handleToggleMemory = async () => {
        const targetState = !memoryEnabled;
        setMemoryEnabled(targetState);
        try {
            const response = await fetch("http://localhost:8000/api/memory/toggle", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ enabled: targetState })
            });
            const data = await response.json();
            if (response.ok) {
                // Update global user details
                setUser(data);
            } else {
                setMemoryEnabled(!targetState);
            }
        } catch (err) {
            console.error("Toggle memory error:", err);
            setMemoryEnabled(!targetState);
        }
    };

    // Delete individual memory
    const handleDeleteMemory = async (id) => {
        try {
            const response = await fetch(`http://localhost:8000/api/memory/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setMemories(prev => prev.filter(m => m._id !== id));
            }
        } catch (err) {
            console.error("Delete memory error:", err);
        }
    };

    // Save edited memory
    const handleSaveEditMemory = async (id) => {
        if (!editTitle.trim() || !editValue.trim()) return;

        try {
            const response = await fetch(`http://localhost:8000/api/memory/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: editTitle,
                    value: editValue,
                    category: editCategory
                })
            });
            const data = await response.json();
            if (response.ok) {
                setMemories(prev => prev.map(m => m._id === id ? data : m));
                setEditingId(null);
            }
        } catch (err) {
            console.error("Update memory failed:", err);
        }
    };

    const handleStartEdit = (m) => {
        setEditingId(m._id);
        setEditTitle(m.title);
        setEditValue(m.value);
        setEditCategory(m.category);
    };

    // Clear all memories
    const executeClearAllMemories = async () => {
        setIsClearingMemory(true);
        try {
            const response = await fetch("http://localhost:8000/api/memory", {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                setMemories([]);
                setShowSuccessClearMemory(true);
                setTimeout(() => {
                    setShowSuccessClearMemory(false);
                    setShowConfirmClearMemory(false);
                }, 1500);
            }
        } catch (err) {
            console.error("Clear memories failed:", err);
        } finally {
            setIsClearingMemory(false);
        }
    };

    // Filter memories based on search query
    const filteredMemories = memories.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card settings-card" onClick={(e) => e.stopPropagation()}>
                
                {/* Chats Delete Confirmation */}
                {showConfirmClear && !showSuccessClear && (
                    <div className="confirm-overlay">
                        <div className="confirm-card">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            <h4>Delete All Chats?</h4>
                            <p>Are you sure you want to delete your entire chat history? This action cannot be undone.</p>
                            <div className="confirm-buttons">
                                <button className="btn-confirm-cancel" onClick={() => setShowConfirmClear(false)} disabled={isDeleting}>Cancel</button>
                                <button className="btn-confirm-delete" onClick={executeClearHistory} disabled={isDeleting}>
                                    {isDeleting ? "Deleting..." : "Yes, Delete All"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chats Delete Success */}
                {showSuccessClear && (
                    <div className="success-overlay">
                        <div className="success-card">
                            <i className="fa-solid fa-circle-check"></i>
                            <h4>History Cleared</h4>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>All threads have been permanently removed.</p>
                        </div>
                    </div>
                )}

                {/* Memory Delete Confirmation */}
                {showConfirmClearMemory && !showSuccessClearMemory && (
                    <div className="confirm-overlay">
                        <div className="confirm-card">
                            <i className="fa-solid fa-circle-nodes" style={{ color: "#ef4444" }}></i>
                            <h4>Clear All Memories?</h4>
                            <p>Are you sure you want to wipe IntelliChat's memory of your preferences? You will need to remind the AI next time.</p>
                            <div className="confirm-buttons">
                                <button className="btn-confirm-cancel" onClick={() => setShowConfirmClearMemory(false)} disabled={isClearingMemory}>Cancel</button>
                                <button className="btn-confirm-delete" onClick={executeClearAllMemories} disabled={isClearingMemory}>
                                    {isClearingMemory ? "Clearing..." : "Yes, Clear Memory"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Memory Delete Success */}
                {showSuccessClearMemory && (
                    <div className="success-overlay">
                        <div className="success-card">
                            <i className="fa-solid fa-circle-check"></i>
                            <h4>Memories Cleared</h4>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>All persistent user information has been wiped.</p>
                        </div>
                    </div>
                )}

                <div className="modal-header">
                    <h3>Settings</h3>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Settings Tab Headers */}
                <div className="settings-tabs-header">
                    <button 
                        className={`settings-tab-btn ${activeTab === "general" ? "active" : ""}`}
                        onClick={() => setActiveTab("general")}
                    >
                        <i className="fa-solid fa-gear"></i> General
                    </button>
                    {token && (
                        <button 
                            className={`settings-tab-btn ${activeTab === "memory" ? "active" : ""}`}
                            onClick={() => setActiveTab("memory")}
                        >
                            <i className="fa-solid fa-brain"></i> Memory
                        </button>
                    )}
                </div>

                <div className="modal-body settings-body-scrollable">
                    {activeTab === "general" ? (
                        <>
                            {/* General Theme settings */}
                            <div className="setting-section">
                                <h4>General</h4>
                                <div className="setting-row">
                                    <div className="setting-info">
                                        <h5>Light Theme</h5>
                                        <p>Toggle between Light and Dark interface modes</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={theme === "light"}
                                            onChange={handleThemeToggle}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>

                            {/* AI configurations */}
                            <div className="setting-section">
                                <h4>AI Assistant Settings</h4>
                                <div className="setting-row-vertical">
                                    <div className="setting-info">
                                        <h5>AI Persona / Instruction Preset</h5>
                                        <p>Select custom rules for the AI's responses</p>
                                    </div>
                                    <select 
                                        className="setting-select" 
                                        value={systemPrompt} 
                                        onChange={handlePromptChange}
                                    >
                                        <option value="default">Default Assistant (Helpful, smart)</option>
                                        <option value="code">Code Specialist (Output clean snippets only)</option>
                                        <option value="explain5">Explain Like I'm 5 (Simple analogies)</option>
                                        <option value="sarcastic">Sarcastic Buddy (Witty, funny)</option>
                                    </select>
                                </div>

                                <div className="setting-row-vertical" style={{ marginTop: "1rem" }}>
                                    <div className="setting-info">
                                        <h5>Creativity Level (Temperature)</h5>
                                        <p>Set response randomness: {temperature <= 0.4 ? "Precise & Focused" : temperature >= 0.8 ? "Creative & Random" : "Balanced"}</p>
                                    </div>
                                    <div className="setting-slider-container">
                                        <input 
                                            type="range" 
                                            min="0.2" 
                                            max="1.0" 
                                            step="0.1" 
                                            value={temperature} 
                                            onChange={handleTemperatureChange}
                                            className="setting-slider"
                                        />
                                        <span className="slider-value">{temperature}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Account details */}
                            <div className="setting-section">
                                <h4>Account Details</h4>
                                <div className="user-profile-info">
                                    <div className="profile-detail">
                                        <span>Name:</span>
                                        <span>{user?.name || "Guest User"}</span>
                                    </div>
                                    <div className="profile-detail">
                                        <span>Email:</span>
                                        <span>{user?.email || "No account linked"}</span>
                                    </div>
                                    <div className="profile-detail">
                                        <span>Plan:</span>
                                        <span>{token ? "Pro Member" : "Free Guest Tier"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            {token && (
                                <div className="setting-section danger-zone">
                                    <h4>Danger Zone</h4>
                                    <div className="setting-row">
                                        <div className="setting-info">
                                            <h5>Clear All Chats</h5>
                                            <p>Permanently delete all threads in your account</p>
                                        </div>
                                        <button className="btn-danger" onClick={() => setShowConfirmClear(true)}>
                                            <i className="fa-solid fa-trash-can"></i> Clear History
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Memory Settings Tab */
                        <div className="memory-settings-tab">
                            <div className="setting-row" style={{ marginBottom: "1.5rem" }}>
                                <div className="setting-info">
                                    <h5>Personalized Memory</h5>
                                    <p>Allow the AI to recall details and preferences across chats</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={memoryEnabled}
                                        onChange={handleToggleMemory}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            {memoryEnabled && (
                                <>
                                    <div className="memory-search-container">
                                        <i className="fa-solid fa-magnifying-glass search-icon-left"></i>
                                        <input
                                            type="text"
                                            placeholder="Search stored facts..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="memory-search-input"
                                        />
                                    </div>

                                    <div className="memory-list-container">
                                        {loadingMemories ? (
                                            <div className="memory-loading-spinner">Loading stored memories...</div>
                                        ) : filteredMemories.length === 0 ? (
                                            <div className="memory-empty-state">
                                                <i className="fa-solid fa-brain"></i>
                                                <p>
                                                    {searchQuery ? "No matching memories found" : "No facts stored yet. Speak naturally during chats (e.g. 'My name is John') and IntelliChat will remember."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="memory-grid">
                                                {filteredMemories.map((m) => (
                                                    <div className="memory-card" key={m._id}>
                                                        {editingId === m._id ? (
                                                            <div className="memory-card-edit-form">
                                                                <input
                                                                    type="text"
                                                                    value={editTitle}
                                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                                    placeholder="Title"
                                                                    className="memory-edit-input"
                                                                />
                                                                <textarea
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    placeholder="Value"
                                                                    className="memory-edit-textarea"
                                                                />
                                                                <div className="memory-edit-footer">
                                                                    <select
                                                                        value={editCategory}
                                                                        onChange={(e) => setEditCategory(e.target.value)}
                                                                        className="memory-edit-select"
                                                                    >
                                                                        <option value="Personal">Personal</option>
                                                                        <option value="Coding">Coding</option>
                                                                        <option value="Education">Education</option>
                                                                        <option value="Work">Work</option>
                                                                        <option value="General">General</option>
                                                                    </select>
                                                                    <div className="memory-edit-actions">
                                                                        <button className="btn-edit-cancel-m" onClick={() => setEditingId(null)}>Cancel</button>
                                                                        <button className="btn-edit-save-m" onClick={() => handleSaveEditMemory(m._id)}>Save</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="memory-card-header">
                                                                    <span className="memory-card-title">{m.title}</span>
                                                                    <span className={`category-pill ${m.category.toLowerCase()}`}>{m.category}</span>
                                                                </div>
                                                                <p className="memory-card-value">{m.value}</p>
                                                                <div className="memory-card-footer">
                                                                    <span className="memory-card-date">Updated: {new Date(m.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                    <div className="memory-card-actions">
                                                                        <button className="btn-memory-action edit" onClick={() => handleStartEdit(m)} title="Edit Memory">
                                                                            <i className="fa-solid fa-pen"></i>
                                                                        </button>
                                                                        <button className="btn-memory-action delete" onClick={() => handleDeleteMemory(m._id)} title="Delete Memory">
                                                                            <i className="fa-solid fa-trash-can"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {memories.length > 0 && (
                                        <div className="setting-section danger-zone" style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
                                            <h4>Memory Control</h4>
                                            <div className="setting-row">
                                                <div className="setting-info">
                                                    <h5>Clear All Memories</h5>
                                                    <p>Permanently erase all personal details saved by the AI</p>
                                                </div>
                                                <button className="btn-danger" onClick={() => setShowConfirmClearMemory(true)}>
                                                    <i className="fa-solid fa-trash-can"></i> Clear Memory
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
