import React, { useState, useContext } from "react";
import "./Auth.css";
import { MyContext } from "./MyContext.jsx";
import { reloadPage, redirectPage } from "./utils/navigation.js";

function Auth() {
    const { setPrevChats, setCurrThreadId, setNewChat, setReply } = useContext(MyContext);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const handleAuth = async (e) => {
        e.preventDefault();
        setError("");

        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const bodyData = isLogin ? { email, password } : { email, password, name };

        try {
            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            const res = await response.json();

            if (!response.ok) {
                setError(res.error || "Authentication failed");
                return;
            }

            // Save token and reload page / trigger state change
            localStorage.setItem("intellichat_token", res.token);
            reloadPage();
        } catch (err) {
            console.error("Auth error:", err);
            setError("Connection failed. Is the server running?");
        }
    };

    const handleGoogleLogin = () => {
        redirectPage("http://localhost:8000/api/auth/google");
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <img src="src/assets/IntelliChatLogo.png" alt="logo" className="auth-logo" />
                    <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
                    <p>{isLogin ? "Sign in to continue to IntelliChat" : "Get started with your free account"}</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="auth-form" onSubmit={handleAuth}>
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name-input">Full Name</label>
                            <input
                                id="name-input"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email-input">Email Address</label>
                        <input
                            id="email-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password-input">Password</label>
                        <input
                            id="password-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary">
                        {isLogin ? "Sign In" : "Sign Up"}
                    </button>
                </form>

                <div className="divider">or</div>

                <button className="btn-google" onClick={handleGoogleLogin}>
                    <img src="https://docs.gimp.org/2.10/en/images/filters/examples/render-grid-gold.png" alt="G" style={{ display: 'none' }} />
                    {/* SVG logo for Google */}
                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-toggle">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <span onClick={() => {
                        setIsLogin(!isLogin);
                        setError("");
                    }}>
                        {isLogin ? "Sign Up" : "Sign In"}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default Auth;
