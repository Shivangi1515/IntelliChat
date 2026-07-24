import React, { useState, useEffect, useContext } from "react";
import "./SettingsModal.css";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

function SettingsModal({ onClose, user }) {
    const {
        token,
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

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("intellichat_theme") || "dark";
    });

    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const [showSuccessClear, setShowSuccessClear] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("intellichat_theme", theme);
    }, [theme]);

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
                
                // Show success screen and close settings after a delay
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
                
                {/* Custom Confirmation Overlay */}
                {showConfirmClear && !showSuccessClear && (
                    <div className="confirm-overlay">
                        <div className="confirm-card">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            <h4>Delete All Chats?</h4>
                            <p>
                                Are you sure you want to delete your entire chat history? This action is permanent and cannot be undone.
                            </p>
                            <div className="confirm-buttons">
                                <button 
                                    className="btn-confirm-cancel" 
                                    onClick={() => setShowConfirmClear(false)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn-confirm-delete" 
                                    onClick={executeClearHistory}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Deleting..." : "Yes, Delete All"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Success Overlay */}
                {showSuccessClear && (
                    <div className="success-overlay">
                        <div className="success-card">
                            <i className="fa-solid fa-circle-check"></i>
                            <h4>History Cleared</h4>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                All threads have been permanently removed.
                            </p>
                        </div>
                    </div>
                )}

                <div className="modal-header">
                    <h3>Settings</h3>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="modal-body">
                    {/* General Settings */}
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

                    {/* AI Configuration Settings */}
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

                    {/* Profile Information */}
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
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
