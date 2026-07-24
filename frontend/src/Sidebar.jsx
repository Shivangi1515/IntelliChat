import "./Sidebar.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

function Sidebar() {
    const { token, allThreads, setAllThreads, currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats } = useContext(MyContext);

    const getAllThreads = async () => {
        if (!token) return;
        try {
            const response = await fetch("http://localhost:8000/api/thread", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await response.json();
            if (response.ok) {
                const filteredData = res.map(thread => ({ threadId: thread.threadId, title: thread.title }));
                setAllThreads(filteredData);
            }
        } catch (err) {
            console.error("Failed to load chat history:", err);
        }
    };

    useEffect(() => {
        getAllThreads();
    }, [currThreadId, token]);

    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
    };

    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);
        try {
            const response = await fetch(`http://localhost:8000/api/thread/${newThreadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await response.json();
            setPrevChats(res);
            setNewChat(false);
            setReply(null);
        } catch (err) {
            console.error("Error changing thread:", err);
        }
    };

    const deleteThread = async (threadId) => {
        try {
            await fetch(`http://localhost:8000/api/thread/${threadId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));
            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (err) {
            console.error("Error deleting thread:", err);
        }
    };

    return (
        <section className="sidebar">
            <div>
                <div className="sidebar-header">
                    <div className="brand">
                        <img src="src/assets/IntelliChatLogo.png" alt="logo" className="logo" />
                        <span>IntelliChat</span>
                    </div>
                </div>
                
                <button className="btn-new-chat" onClick={createNewChat}>
                    <i className="fa-solid fa-plus"></i> New Chat
                </button>
            </div>

            <div className="history-container">
                <div className="history-title">Recent Chats</div>
                <ul className="history">
                    {
                        allThreads?.map((thread, idx) => (
                            <li key={thread.threadId || idx}
                                onClick={() => changeThread(thread.threadId)}
                                className={thread.threadId === currThreadId ? "highlighted" : ""}
                            >
                                <span className="thread-title">{thread.title}</span>
                                <i className="fa-solid fa-trash btn-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteThread(thread.threadId);
                                    }}
                                ></i>
                            </li>
                        ))
                    }
                </ul>
            </div>

            <div className="sidebar-footer">
                <div className="sign">
                    <p>Made with <span>&hearts;</span> by IntelliChat</p>
                </div>
            </div>
        </section>
    );
}

export default Sidebar;