import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import GroupSidebar from './components/GroupSidebar.jsx';
import ChatArea from './components/ChatArea.jsx';
import GroupChatArea from './components/GroupChatArea.jsx';

// Import the components from App.jsx
// Note: These components are defined in App.jsx, so we need to move them to separate files
// For now, I'll create a simple version here

const API_BASE = "http://localhost:4000/api";

function GMTBOT({ token, user, onLogout, onAdminDashboard }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Group chat state
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroupSessionId, setActiveGroupSessionId] = useState(null);
  const [groupSessions, setGroupSessions] = useState({});
  const [chatMode, setChatMode] = useState('individual'); // 'individual' or 'group'

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeGroupSession = groupSessions[activeGroupId]?.find(s => s.id === activeGroupSessionId);

  const LANGFLOW_API_URL = `${API_BASE}/llm/process`;

  // Load user's sessions on component mount
  useEffect(() => {
    if (token) {
      loadSessions();
      loadGroups();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (chatMode === 'group' && groups.length > 0 && (!activeGroupId || !activeGroupSessionId)) {
      // Find the first group with at least one session
      const firstGroup = groups[0];
      const firstSession = groupSessions[firstGroup.id]?.[0];
      if (firstGroup && firstSession) {
        setActiveGroupId(firstGroup.id);
        setActiveGroupSessionId(firstSession.id);
      }
    }
  }, [chatMode, groups, groupSessions]);

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Failed to load sessions');
      }
      
      const data = await response.json();
      setSessions(data);
      
      // Set the first session as active, or create a new one if none exist
      if (data.length > 0) {
        setActiveSessionId(data[0].id);
      } else {
        await handleNewChat();
      }
    } catch (error) {
      // Create a new session if loading fails
      await handleNewChat();
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch(`${API_BASE}/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setGroups(data);
      // Load group sessions for each group
      if (data.length > 0) {
        loadGroupSessions(data);
      }
    } catch (error) {
    }
  };

  const loadGroupSessions = async (groupsToLoad) => {
    try {
      const sessionsPromises = groupsToLoad.map(group => 
        fetch(`${API_BASE}/groups/${group.id}/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(async res => {
          if (!res.ok) {
            const errorText = await res.text();
            return [];
          }
          return res.json();
        })
      );
      const sessionsArrays = await Promise.all(sessionsPromises);
      const sessionsMap = {};
      groupsToLoad.forEach((group, index) => {
        sessionsMap[group.id] = Array.isArray(sessionsArrays[index]) ? sessionsArrays[index] : [];
      });
      setGroupSessions(sessionsMap);
    } catch (error) {
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
    }
  };

  const saveGroupMessage = async (content, role = 'user') => {
    if (!activeGroupId || !activeGroupSessionId) return;
    try {
      const response = await fetch(`${API_BASE}/groups/${activeGroupId}/sessions/${activeGroupSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, role })
      });
      if (!response.ok) {
        const errorText = await response.text();
        return null;
      }
      const savedMessage = await response.json();
      setGroupSessions(prev => ({
        ...prev,
        [activeGroupId]: (prev[activeGroupId] || []).map(session => {
          if (session.id === activeGroupSessionId) {
            return {
              ...session,
              messages: [...(session.messages || []), savedMessage]
            };
          }
          return session;
        })
      }));
      return savedMessage;
    } catch (error) {
      return null;
    }
  };

  const handleSend = async (input, askBot = false) => {
    if (chatMode === 'group') {
      await handleGroupSend(input, askBot);
    } else {
      await handleIndividualSend(input);
    }
  };

  const handleIndividualSend = async (input) => {
    if (!activeSessionId) {
      await handleNewChat();
      return;
    }

    setIsTyping(true);

    // Save user message to database
    await saveMessage(input, 'user');

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
      // Save assistant message to database
      await saveMessage(aiContent, 'assistant');
    } catch (err) {
      const errorMsg = `Error: ${err.message}`;
      await saveMessage(errorMsg, 'assistant');
    } finally {
      // Always fetch the latest session from the backend to update the UI
      const response = await fetch(`${API_BASE}/sessions/${activeSessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const updatedSession = await response.json();
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId ? updatedSession : s
        ));
      }
      setIsTyping(false);
    }
  };

  const handleGroupSend = async (input, askBot = false) => {
    if (!activeGroupId || !activeGroupSessionId) {
      return;
    }

    // Save user message to database
    await saveGroupMessage(input, 'user');

    if (askBot) {
      // Prepare payload for Langflow API
      const payload = {
        input_value: input,
        output_type: "chat",
        input_type: "chat",
        session_id: `group_${activeGroupSessionId}`
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
        // Save assistant message to database as a group message
        await saveGroupMessage(aiContent, 'assistant');
      } catch (err) {
        const errorMsg = `Error: ${err.message}`;
        await saveGroupMessage(errorMsg, 'assistant');
      }
    }
  };

  const handleSessionChange = (sessionId) => {
    setActiveSessionId(sessionId);
    setChatMode('individual');
  };

  const handleGroupSessionChange = (groupId, sessionId) => {
    setActiveGroupId(groupId);
    setActiveGroupSessionId(sessionId);
    setChatMode('group');
  };

  // Handler to update a session in state after rename
  const handleSessionUpdate = (updatedSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  // Handler to remove a session from state after delete
  const handleSessionDelete = (deletedSessionId) => {
    setSessions(prev => prev.filter(s => s.id !== deletedSessionId));
    // If the deleted session was active, select another session
    if (activeSessionId === deletedSessionId) {
      const remaining = sessions.filter(s => s.id !== deletedSessionId);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
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
      {/* Logout and Admin Dashboard buttons - top right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <button
          onClick={onLogout}
          className="bg-[#565869] text-white px-4 py-2 rounded shadow-lg hover:bg-[#676a7d] transition font-inter"
        >
          Logout
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={onAdminDashboard}
            className="bg-[#343541] border border-[#19c37d] text-[#19c37d] px-4 py-2 rounded shadow hover:bg-[#23262e] transition font-inter"
          >
            Admin Dashboard
          </button>
        )}
      </div>

      {chatMode === 'individual' ? (
        <Sidebar 
          sessions={sessions}
          activeSessionId={activeSessionId}
          setActiveSessionId={handleSessionChange}
          onNewChat={handleNewChat}
          isVisible={sidebarVisible}
          user={user}
          token={token}
          onSessionUpdate={handleSessionUpdate}
          onSessionDelete={handleSessionDelete}
        />
      ) : (
        <GroupSidebar 
          groups={groups}
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          activeSessionId={activeGroupSessionId}
          setActiveSessionId={setActiveGroupSessionId}
          isVisible={sidebarVisible}
          user={user}
          token={token}
          onGroupUpdate={() => {}}
          onSessionUpdate={() => {}}
          onSessionDelete={() => {}}
        />
      )}
      
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Chat Mode Toggle - now inside chat area, centered with flex */}
        <div className="flex justify-center items-center w-full py-4 bg-transparent">
          <div className="flex bg-[#40414f] rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setChatMode('individual')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                chatMode === 'individual' 
                  ? 'bg-[#19c37d] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setChatMode('group')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                chatMode === 'group' 
                  ? 'bg-[#19c37d] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Group
            </button>
          </div>
        </div>
        {/* Mobile menu button */}
        <button
          className="md:hidden absolute top-4 left-20 z-10 p-2 text-white hover:bg-[#40414f] rounded-lg"
          onClick={() => setSidebarVisible(!sidebarVisible)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {chatMode === 'individual' ? (
          <ChatArea 
            messages={activeSession?.messages || []}
            onSend={handleSend}
            isTyping={isTyping}
          />
        ) : (
          <GroupChatArea 
            messages={activeGroupSession?.messages || []}
            onSend={handleSend}
            isTyping={false}
            currentUserId={user?.id}
            groupName={activeGroup?.name || 'Group Chat'}
            sessionName={activeGroupSession?.name || 'Session'}
          />
        )}
      </div>
    </div>
  );
}

export default GMTBOT; 