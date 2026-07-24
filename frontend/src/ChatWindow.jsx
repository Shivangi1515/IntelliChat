import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState } from "react";

function ChatWindow() {
    const {
        prompt, setPrompt,
        setReply,
        currThreadId,
        setPrevChats,
        setNewChat,
        setAllThreads,
        loading, setLoading
    } = useContext(MyContext);
    const [isOpen, setIsOpen] = useState(false);

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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: messageText,
                threadId: currThreadId
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
                const threadResponse = await fetch("http://localhost:8000/api/thread");
                const threadList = await threadResponse.json();
                const filteredData = threadList.map(t => ({ threadId: t.threadId, title: t.title }));
                setAllThreads(filteredData);
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

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span className="navbar-title">IntelliChat <i className="fa-solid fa-chevron-down"></i></span>
                <div className="userIconDiv" onClick={handleProfileClick}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>
            {
                isOpen && 
                <div className="dropDown">
                    <div className="dropDownItem"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="dropDownItem"><i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
                    <div className="dropDownItem"><i className="fa-solid fa-arrow-right-from-bracket"></i> Log out</div>
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
                    <div id="submit" onClick={getReply}>
                        <i className="fa-solid fa-paper-plane"></i>
                    </div>
                </div>
                <p className="info">
                    IntelliChat can make mistakes. Check important info. See Cookie Preferences.
                </p>
            </div>
        </div>
    );
}

export default ChatWindow;