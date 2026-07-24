import React, { useState, useEffect } from "react";
import "./ShareModal.css";

function ShareModal({ onClose, threadId, token }) {
    const [shareToken, setShareToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState("");

    const initializeShare = async () => {
        try {
            // Auto-enable sharing and get the share token in one call
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
            } else {
                showToast("Failed to generate link");
            }
        } catch (err) {
            console.error("Auto-share initiation failed:", err);
            showToast("Connection failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeShare();
    }, [threadId, token]);

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
                        <div className="share-loading">Generating link...</div>
                    ) : (
                        <>
                            {shareToken && (
                                <div className="share-link-section" style={{ border: "none", background: "transparent", padding: 0 }}>
                                    <div className="social-share-row" style={{ justifyContent: "center", padding: "1rem 0" }}>
                                        <a 
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out my conversation on IntelliChat: ")}&url=${encodeURIComponent(getShareUrl())}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn-social twitter"
                                            title="Share on X"
                                        >
                                            <i className="fa-brands fa-x-twitter"></i>
                                        </a>
                                        <a 
                                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out my conversation on IntelliChat: " + getShareUrl())}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn-social whatsapp"
                                            title="Share on WhatsApp"
                                        >
                                            <i className="fa-brands fa-whatsapp"></i>
                                        </a>
                                        <a 
                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn-social facebook"
                                            title="Share on Facebook"
                                        >
                                            <i className="fa-brands fa-facebook-f"></i>
                                        </a>
                                        <a 
                                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn-social linkedin"
                                            title="Share on LinkedIn"
                                        >
                                            <i className="fa-brands fa-linkedin-in"></i>
                                        </a>
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
