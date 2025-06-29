import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

// Import the components from App.jsx
// Note: These components are defined in App.jsx, so we need to move them to separate files
// For now, I'll create a simple version here

const API_BASE = "http://localhost:4000/api";

function ChatGPTClone({ user, token, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const LANGFLOW_API_URL = "https://langflowbubblemvp-production.up.railway.app/api/v1/run/c0504846-5aeb-4bde-b8a9-19185e33f7a3";

  // Load user's sessions on component mount
  useEffect(() => {
    console.log('ChatGPTClone mounted, token:', token ? 'present' : 'missing');
    if (token) {
      loadSessions();
    } else {
      console.error('No token provided to ChatGPTClone');
      setLoading(false);
    }
  }, [token]);

  const loadSessions = async () => {
    console.log('Loading sessions...');
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Sessions response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load sessions:', errorText);
        throw new Error('Failed to load sessions');
      }
      
      const data = await response.json();
      console.log('Sessions loaded:', data.length);
      setSessions(data);
      
      // Set the first session as active, or create a new one if none exist
      if (data.length > 0) {
        setActiveSessionId(data[0].id);
        console.log('Set active session:', data[0].id);
      } else {
        console.log('No sessions found, creating new chat...');
        await handleNewChat();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Create a new session if loading fails
      await handleNewChat();
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'New Chat' })
      });

      if (!response.ok) throw new Error('Failed to create session');
      
      const newSession = await response.json();
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const saveMessage = async (content, role) => {
    if (!activeSessionId) return;

    try {
      const response = await fetch(`${API_BASE}/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, role })
      });

      if (!response.ok) throw new Error('Failed to save message');
      
      const savedMessage = await response.json();
      
      // Update sessions with the new message
      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, savedMessage]
          };
        }
        return session;
      }));

      return savedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSend = async (input) => {
    if (!activeSessionId) {
      await handleNewChat();
      return;
    }

    setIsTyping(true);

    // Save user message to database and get the saved message (with updated session name if needed)
    const savedUserMsg = await saveMessage(input, 'user');

    // Fetch the updated session (to get the new name if it changed)
    const response = await fetch(`${API_BASE}/sessions/${activeSessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const updatedSession = await response.json();
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? updatedSession : s
      ));
    }

    // Prepare payload for Langflow API
    const payload = {
      input_value: input,
      output_type: "chat",
      input_type: "chat",
      session_id: `session_${activeSessionId}`
    };

    try {
      const response = await fetch(LANGFLOW_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      let aiContent = "";
      try {
        const o = data.outputs?.[0]?.outputs?.[0];
        if (o?.results?.message?.data?.text) {
          aiContent = o.results.message.data.text;
        } else if (o?.results?.message?.text) {
          aiContent = o.results.message.text;
        } else if (o?.outputs?.message?.message) {
          aiContent = o.outputs.message.message;
        } else if (o?.artifacts?.message) {
          aiContent = o.artifacts.message;
        } else if (o?.messages?.[0]?.message) {
          aiContent = o.messages[0].message;
        } else {
          aiContent = data?.output || data?.message || JSON.stringify(data);
        }
      } catch (e) {
        aiContent = JSON.stringify(data);
      }
      // Save assistant message to database and get the saved message
      const savedBotMsg = await saveMessage(aiContent, 'assistant');
      // Update UI with both messages
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, savedUserMsg, savedBotMsg] }
          : s
      ));
    } catch (err) {
      const errorMsg = `Error: ${err.message}`;
      const savedBotMsg = await saveMessage(errorMsg, 'assistant');
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, savedUserMsg, savedBotMsg] }
          : s
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSessionChange = (sessionId) => {
    setActiveSessionId(sessionId);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#343541] items-center justify-center">
        <div className="text-white text-lg">Loading your chats...</div>
      </div>
    );
  }

  // You can add your Sidebar, ChatArea, etc. components here as before
  // For brevity, this is a placeholder UI
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#343541]">
      {/* Logout button - positioned on the right */}
      <button
        onClick={onLogout}
        className="fixed top-4 right-4 bg-[#565869] text-white px-4 py-2 rounded shadow-lg z-50 hover:bg-[#676a7d] transition font-inter"
      >
        Logout
      </button>
      
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={handleSessionChange}
        onNewChat={handleNewChat}
        isVisible={sidebarVisible}
        user={user}
        token={token}
      />
      
      <div className="flex-1 flex flex-col relative">
        {/* Mobile menu button */}
        <button
          className="md:hidden absolute top-4 left-4 z-10 p-2 text-white hover:bg-[#40414f] rounded-lg"
          onClick={() => setSidebarVisible(!sidebarVisible)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Admin indicator */}
        {user?.role === 'admin' && (
          <div className="absolute top-4 left-20 md:left-4 z-10 bg-[#19c37d] text-white px-3 py-1 rounded text-xs font-medium">
            Admin Mode
          </div>
        )}
        
        <ChatArea 
          messages={activeSession?.messages || []}
          onSend={handleSend}
          isTyping={isTyping}
        />
      </div>
    </div>
  );
}

export default ChatGPTClone; 