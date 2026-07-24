import React, { useState, useEffect } from "react";
import "./ShareModal.css";

function ShareModal({ onClose, threadId, token }) {
    const [isShared, setIsShared] = useState(false);
    const [shareToken, setShareToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState("");

    const fetchShareStatus = async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/thread/${threadId}/share`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setIsShared(data.isShared);
                setShareToken(data.shareToken);
            }
        } catch (err) {
            console.error("Failed to load share details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShareStatus();
    }, [threadId, token]);

    const handleToggleShare = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/thread/${threadId}/share`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isShared: !isShared })
            });
            const data = await response.json();
            if (response.ok) {
                setIsShared(data.isShared);
                setShareToken(data.shareToken);
                showToast(data.isShared ? "Public link generated!" : "Sharing disabled");
            }
        } catch (err) {
            console.error("Toggle share failed:", err);
            showToast("Connection failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateLink = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/thread/${threadId}/share`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isShared: true })
            });
            const data = await response.json();
            if (response.ok) {
                setShareToken(data.shareToken);
                showToast("New public link generated!");
            }
        } catch (err) {
            console.error("Regenerate share failed:", err);
            showToast("Regeneration failed");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 2000);
    };

    const getShareUrl = () => {
        return `${window.location.origin}/share/${shareToken}`;
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(getShareUrl());
        showToast("Copied to clipboard!");
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card share-modal" onClick={(e) => e.stopPropagation()}>
                
                {toastMessage && (
                    <div className="share-toast">
                        <i className="fa-solid fa-circle-check"></i> {toastMessage}
                    </div>
                )}

                <div className="modal-header">
                    <h3>Share Conversation</h3>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="modal-body share-body">
                    {loading ? (
                        <div className="share-loading">Loading sharing info...</div>
                    ) : (
                        <>
                            <p className="share-desc">
                                Share a read-only snapshot of this chat with anyone. People with this link can view the conversation without logging in.
                            </p>

                            <div className="share-row">
                                <div className="share-info-left">
                                    <h5>Public Sharing</h5>
                                    <p>{isShared ? "Anyone with the link can view" : "Only you can see this conversation"}</p>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={isShared}
                                        onChange={handleToggleShare}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            {isShared && shareToken && (
                                <div className="share-link-section">
                                    <div className="share-url-container">
                                        <input
                                            type="text"
                                            readOnly
                                            value={getShareUrl()}
                                            className="share-url-input"
                                            onClick={(e) => e.target.select()}
                                        />
                                        <button className="btn-copy-url" onClick={handleCopyUrl} title="Copy Link">
                                            <i className="fa-solid fa-copy"></i> Copy
                                        </button>
                                    </div>

                                    <div className="share-actions">
                                        <button className="btn-regenerate-link" onClick={handleRegenerateLink}>
                                            <i className="fa-solid fa-arrows-rotate"></i> Regenerate Link (Old link will stop working)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ShareModal;
