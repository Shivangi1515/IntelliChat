import React from "react";
import "./SettingsModal.css"; // Reuse modal-overlay and modal-card styles
import "./UpgradeModal.css";

function UpgradeModal({ onClose }) {
    const handleUpgrade = () => {
        alert("Thank you for choosing IntelliChat Pro! Integrating payment flow...");
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
                <div className="modal-header">
                    <h3>Upgrade Plan</h3>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                        Choose the plan that fits your workflows. Scale up for advanced AI capabilities.
                    </p>

                    <div className="pricing-grid">
                        {/* Free Plan */}
                        <div className="plan-card">
                            <div className="plan-header">
                                <h4>Free Tier</h4>
                                <div className="plan-price">$0 <span>/ month</span></div>
                                <ul className="plan-features">
                                    <li><i className="fa-solid fa-circle-check"></i> Standard response speed</li>
                                    <li><i className="fa-solid fa-circle-check"></i> Access to base model</li>
                                    <li><i className="fa-solid fa-circle-check"></i> Web access interface</li>
                                </ul>
                            </div>
                            <button className="btn-plan" disabled style={{ opacity: 0.5, cursor: "default" }}>
                                Current Plan
                            </button>
                        </div>

                        {/* Pro Plan */}
                        <div className="plan-card popular">
                            <div className="plan-header">
                                <h4>Pro Tier</h4>
                                <div className="plan-price">$20 <span>/ month</span></div>
                                <ul className="plan-features">
                                    <li><i className="fa-solid fa-circle-check"></i> Premium Llama 3.3 70B</li>
                                    <li><i className="fa-solid fa-circle-check"></i> 5x faster generation</li>
                                    <li><i className="fa-solid fa-circle-check"></i> Full conversational memory</li>
                                    <li><i className="fa-solid fa-circle-check"></i> Voice speech-to-text inputs</li>
                                </ul>
                            </div>
                            <button className="btn-plan" onClick={handleUpgrade}>
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpgradeModal;
