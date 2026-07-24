import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import SettingsModal from "./SettingsModal.jsx";
import UpgradeModal from "./UpgradeModal.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState } from "react";

function ChatWindow() {
    const {
        token, setToken,
        user, setUser,
        prompt, setPrompt,
        setReply,
        currThreadId,
        setPrevChats,
        setNewChat,
        setAllThreads,
        loading, setLoading,
        systemPrompt,
        temperature
    } = useContext(MyContext);

    const [isOpen, setIsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const getReply = async () => {
        const messageText = prompt.trim();
        if (!messageText || loading) return;

        // Stage user message immediately
        setPrevChats(prev => [...prev, { role: "user", content: messageText }]);
        setPrompt("");
        setLoading(true);
        setNewChat(false);

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                message: messageText,
                threadId: currThreadId,
                systemPrompt,
                temperature
            })
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
                    const filteredData = threadList.map(t => ({ threadId: t.threadId, title: t.title }));
                    setAllThreads(filteredData);
                }
            }
        } catch (err) {
            console.error("Error getting chat response:", err);
            setPrevChats(prev => [...prev, { role: "assistant", content: "Oops! Something went wrong while generating response." }]);
        } finally {
            setLoading(false);
        }
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

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span className="navbar-title">IntelliChat <i className="fa-solid fa-chevron-down"></i></span>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon">
                        <i className="fa-solid fa-user"></i>
                    </span>
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
                <div className="inputBox">
                    <input placeholder="Ask anything..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' ? getReply() : ''}
                    />
                    <div className={`btn-mic ${isListening ? 'listening' : ''}`} onClick={startSpeechRecognition}>
                        <i className="fa-solid fa-microphone"></i>
                    </div>
                    <div id="submit" onClick={getReply}>
                        <i className="fa-solid fa-paper-plane"></i>
                    </div>
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
        </div>
    );
}

export default ChatWindow;