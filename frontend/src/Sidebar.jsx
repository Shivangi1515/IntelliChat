import "./Sidebar.css";
import React, { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

function Sidebar() {
    const {
        token,
        allThreads,
        setAllThreads,
        currThreadId,
        setNewChat,
        setPrompt,
        setReply,
        setCurrThreadId,
        setPrevChats,
        searchQuery,
        setSearchQuery,
        setHighlightedMessageIndex
    } = useContext(MyContext);

    const [archivedThreads, setArchivedThreads] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Get Active (unarchived) Threads
    const getAllThreads = async () => {
        if (!token) return;
        try {
            const response = await fetch("http://localhost:8000/api/thread?archived=false", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await response.json();
            if (response.ok) {
                setAllThreads(res);
            }
        } catch (err) {
            console.error("Failed to load chat history:", err);
        }
    };

    // Get Archived Threads
    const getArchivedThreads = async () => {
        if (!token) return;
        try {
            const response = await fetch("http://localhost:8000/api/thread?archived=true", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const res = await response.json();
            if (response.ok) {
                setArchivedThreads(res);
            }
        } catch (err) {
            console.error("Failed to load archived chats:", err);
        }
    };

    useEffect(() => {
        getAllThreads();
        if (showArchived) {
            getArchivedThreads();
        }
    }, [currThreadId, token, showArchived]);

    // Live search query effect with debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const delayDebounceFn = setTimeout(async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/thread?q=${encodeURIComponent(searchQuery)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const res = await response.json();
                if (response.ok) {
                    setSearchResults(res);
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, token]);

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

    const changeThreadFromSearch = async (threadId, matchingMsgIndex) => {
        setSearchQuery("");
        setHighlightedMessageIndex(matchingMsgIndex);
        await changeThread(threadId);
    };

    const deleteThread = async (threadId, isArchivedList = false) => {
        try {
            await fetch(`http://localhost:8000/api/thread/${threadId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isArchivedList) {
                setArchivedThreads(prev => prev.filter(t => t.threadId !== threadId));
            } else {
                setAllThreads(prev => prev.filter(t => t.threadId !== threadId));
            }
            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (err) {
            console.error("Error deleting thread:", err);
        }
    };

    const togglePin = async (threadId, currentPinState) => {
        try {
            const response = await fetch(`http://localhost:8000/api/thread/${threadId}/pin`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isPinned: !currentPinState })
            });
            if (response.ok) {
                getAllThreads();
            }
        } catch (err) {
            console.error("Toggle pin error:", err);
        }
    };

    const toggleArchive = async (threadId, currentArchiveState) => {
        try {
            const response = await fetch(`http://localhost:8000/api/thread/${threadId}/archive`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ isArchived: !currentArchiveState })
            });
            if (response.ok) {
                getAllThreads();
                if (showArchived || !currentArchiveState) {
                    getArchivedThreads();
                }
            }
        } catch (err) {
            console.error("Toggle archive error:", err);
        }
    };

    // Helper to find and highlight search matches in snippets
    const renderSnippet = (messages) => {
        if (!searchQuery) return null;
        for (let i = 0; i < messages.length; i++) {
            const content = messages[i].content;
            const index = content.toLowerCase().indexOf(searchQuery.toLowerCase());
            if (index !== -1) {
                const start = Math.max(0, index - 20);
                const end = Math.min(content.length, index + searchQuery.length + 30);
                const prefix = start > 0 ? "..." : "";
                const suffix = end < content.length ? "..." : "";
                const snippet = content.substring(start, end);
                
                return {
                    snippetIndex: i,
                    prefix,
                    snippet,
                    suffix
                };
            }
        }
        return null;
    };

    // Separate pinned and unpinned active threads
    const pinnedThreads = allThreads.filter(t => t.isPinned);
    const unpinnedThreads = allThreads.filter(t => !t.isPinned);

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

                {/* Search Bar */}
                {token && (
                    <div className="search-bar-container">
                        <i className="fa-solid fa-magnifying-glass search-icon"></i>
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <i className="fa-solid fa-xmark clear-search-icon" onClick={() => setSearchQuery("")}></i>
                        )}
                    </div>
                )}
            </div>

            <div className="history-container">
                {/* Search Mode */}
                {searchQuery.trim() !== "" ? (
                    <div className="search-results-section">
                        <div className="history-title">Search Results</div>
                        {isSearching ? (
                            <div className="search-info-msg">Searching...</div>
                        ) : searchResults.length === 0 ? (
                            <div className="search-info-msg">No matches found</div>
                        ) : (
                            <ul className="history">
                                {searchResults.map((thread) => {
                                    const matchInfo = renderSnippet(thread.messages || []);
                                    return (
                                        <li 
                                            key={thread.threadId}
                                            onClick={() => changeThreadFromSearch(thread.threadId, matchInfo?.snippetIndex ?? null)}
                                            className="search-result-item"
                                        >
                                            <span className="thread-title search-hit-title">{thread.title}</span>
                                            {matchInfo && (
                                                <span className="search-snippet">
                                                    {matchInfo.prefix}
                                                    {matchInfo.snippet.split(new RegExp(`(${searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi")).map((part, i) => 
                                                        part.toLowerCase() === searchQuery.toLowerCase() 
                                                            ? <mark key={i} className="highlight">{part}</mark> 
                                                            : part
                                                    )}
                                                    {matchInfo.suffix}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ) : (
                    // Regular History Mode
                    <>
                        {/* Pinned Chats */}
                        {pinnedThreads.length > 0 && (
                            <div className="pinned-threads-section">
                                <div className="history-title"><i className="fa-solid fa-thumbtack" style={{ fontSize: '0.75rem', marginRight: '4px' }}></i> Pinned</div>
                                <ul className="history" style={{ marginBottom: "1rem" }}>
                                    {pinnedThreads.map((thread) => (
                                        <li key={thread.threadId}
                                            onClick={() => changeThread(thread.threadId)}
                                            className={thread.threadId === currThreadId ? "highlighted" : ""}
                                        >
                                            <span className="thread-title">{thread.title}</span>
                                            <div className="thread-actions">
                                                <i className="fa-solid fa-thumbtack btn-action-icon pinned"
                                                    title="Unpin Chat"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePin(thread.threadId, true);
                                                    }}
                                                ></i>
                                                <i className="fa-solid fa-box-archive btn-action-icon"
                                                    title="Archive Chat"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleArchive(thread.threadId, false);
                                                    }}
                                                ></i>
                                                <i className="fa-solid fa-trash btn-delete"
                                                    title="Delete Chat"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteThread(thread.threadId);
                                                    }}
                                                ></i>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recent Chats (Unpinned) */}
                        <div className="history-title">Recent Chats</div>
                        <ul className="history">
                            {unpinnedThreads.length === 0 && pinnedThreads.length === 0 ? (
                                <div className="history-empty-msg">No conversations yet</div>
                            ) : (
                                unpinnedThreads.map((thread) => (
                                    <li key={thread.threadId}
                                        onClick={() => changeThread(thread.threadId)}
                                        className={thread.threadId === currThreadId ? "highlighted" : ""}
                                    >
                                        <span className="thread-title">{thread.title}</span>
                                        <div className="thread-actions">
                                            <i className="fa-solid fa-thumbtack btn-action-icon"
                                                title="Pin Chat"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePin(thread.threadId, false);
                                                }}
                                            ></i>
                                            <i className="fa-solid fa-box-archive btn-action-icon"
                                                title="Archive Chat"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleArchive(thread.threadId, false);
                                                }}
                                            ></i>
                                            <i className="fa-solid fa-trash btn-delete"
                                                title="Delete Chat"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteThread(thread.threadId);
                                                }}
                                            ></i>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>

                        {/* Archived Chats Section */}
                        {token && (
                            <div className="archived-threads-section">
                                <div 
                                    className="archived-section-header" 
                                    onClick={() => setShowArchived(!showArchived)}
                                >
                                    <span>Archived Chats ({archivedThreads.length})</span>
                                    <i className={`fa-solid fa-chevron-${showArchived ? "down" : "right"}`}></i>
                                </div>
                                
                                {showArchived && (
                                    <ul className="history archived-list">
                                        {archivedThreads.length === 0 ? (
                                            <div className="history-empty-msg">No archived chats</div>
                                        ) : (
                                            archivedThreads.map((thread) => (
                                                <li key={thread.threadId}
                                                    onClick={() => changeThread(thread.threadId)}
                                                    className={thread.threadId === currThreadId ? "highlighted" : ""}
                                                >
                                                    <span className="thread-title">{thread.title}</span>
                                                    <div className="thread-actions">
                                                        <i className="fa-solid fa-box-open btn-action-icon"
                                                            title="Unarchive Chat"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleArchive(thread.threadId, true);
                                                            }}
                                                        ></i>
                                                        <i className="fa-solid fa-trash btn-delete"
                                                            title="Permanently Delete"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteThread(thread.threadId, true);
                                                            }}
                                                        ></i>
                                                    </div>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                )}
                            </div>
                        )}
                    </>
                )}
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