import React, { useState, useEffect } from "react";
import "./SettingsModal.css";

function SettingsModal({ onClose, user }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("intellichat_theme") || "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("intellichat_theme", theme);
    }, [theme]);

    const handleThemeToggle = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Settings</h3>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>Light Theme</h4>
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

                    <div className="user-profile-info">
                        <div className="profile-detail">
                            <span>Name:</span>
                            <span>{user?.name || "User"}</span>
                        </div>
                        <div className="profile-detail">
                            <span>Email:</span>
                            <span>{user?.email || "Guest"}</span>
                        </div>
                        <div className="profile-detail">
                            <span>Plan:</span>
                            <span>Free Tier</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
