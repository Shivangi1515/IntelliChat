import './App.css';
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import Auth from "./Auth.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState, useEffect } from 'react';
import { v1 as uuidv1 } from "uuid";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("intellichat_token"));
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]); //stores all chats of curr threads
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initial theme set
    const savedTheme = localStorage.getItem("intellichat_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Check for Google OAuth callback token in URL search params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    if (tokenFromUrl) {
      localStorage.setItem("intellichat_token", tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
      setToken(tokenFromUrl);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    if (token === "mock_jwt_token_google_user_123456") {
      setUser({ name: "Shiva Chaurasia", email: "shiva@google.com" });
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const res = await response.json();
        if (response.ok) {
          setUser(res);
        } else {
          // Token expired or invalid
          localStorage.removeItem("intellichat_token");
          setToken(null);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };

    fetchProfile();
  }, [token]);

  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem("intellichat_system_prompt") || "default");
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem("intellichat_temperature");
    return saved ? parseFloat(saved) : 0.7;
  });

  const providerValues = {
    token, setToken,
    user, setUser,
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    newChat, setNewChat,
    prevChats, setPrevChats,
    allThreads, setAllThreads,
    loading, setLoading,
    systemPrompt, setSystemPrompt,
    temperature, setTemperature
  }; 

  return (
    <div className='app'>
      <MyContext.Provider value={providerValues}>
        <Sidebar />
        <ChatWindow />
      </MyContext.Provider>
    </div>
  );
}

export default App;
