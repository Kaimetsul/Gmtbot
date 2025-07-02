import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:4000/api";

function GroupSidebar({ 
  groups, 
  activeGroupId, 
  setActiveGroupId, 
  activeSessionId, 
  setActiveSessionId,
  isVisible, 
  user, 
  token, 
  onGroupUpdate, 
  onSessionUpdate, 
  onSessionDelete 
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [groupSessions, setGroupSessions] = useState({});
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (groups.length > 0) {
      loadGroupSessions();
    }
  }, [groups]);

  const loadGroupSessions = async () => {
    setLoadingGroups(true);
    try {
      const sessionsPromises = groups.map(group => 
        fetch(`${API_BASE}/groups/${group.id}/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(async res => {
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`Failed to load sessions for group ${group.id}:`, errorText);
            return [];
          }
          return res.json();
        })
      );
      const sessionsArrays = await Promise.all(sessionsPromises);
      const sessionsMap = {};
      groups.forEach((group, index) => {
        sessionsMap[group.id] = Array.isArray(sessionsArrays[index]) ? sessionsArrays[index] : [];
      });
      setGroupSessions(sessionsMap);
    } catch (error) {
      console.error('Error loading group sessions:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleNewGroupSession = async (groupId) => {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'New Group Chat' })
      });

      if (!response.ok) throw new Error('Failed to create group session');
      
      const newSession = await response.json();
      
      // Update the group sessions
      setGroupSessions(prev => ({
        ...prev,
        [groupId]: [newSession, ...(prev[groupId] || [])]
      }));

      // Set as active
      setActiveGroupId(groupId);
      setActiveSessionId(newSession.id);
    } catch (error) {
      console.error('Error creating group session:', error);
      alert('Failed to create group session');
    }
  };

  const handleDeleteGroupSession = async (groupId, sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this group chat?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete group session');
      
      // Update the group sessions
      setGroupSessions(prev => ({
        ...prev,
        [groupId]: prev[groupId].filter(s => s.id !== sessionId)
      }));

      // If the deleted session was active, select another session
      if (activeSessionId === sessionId) {
        const remaining = groupSessions[groupId].filter(s => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting group session:', error);
      alert('Failed to delete group session');
    }
  };

  const handleRenameGroupSession = async (groupId, sessionId) => {
    if (!renameValue.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: renameValue })
      });
      
      if (!response.ok) throw new Error('Failed to rename group session');
      
      const updatedSession = await response.json();
      
      // Update the group sessions
      setGroupSessions(prev => ({
        ...prev,
        [groupId]: prev[groupId].map(s => 
          s.id === sessionId ? updatedSession : s
        )
      }));

      setRenamingId(null);
      setRenameValue("");
    } catch (error) {
      console.error('Error renaming group session:', error);
      alert('Failed to rename group session');
    }
  };

  if (!isVisible) return null;

  return (
    <aside className="flex flex-col h-full w-64 bg-[#202123] text-white border-r border-[#565869]">
      <div className="p-4 border-b border-[#565869]">
        <h2 className="text-lg font-semibold mb-2">Group Chats</h2>
        {loadingGroups && (
          <div className="text-sm text-gray-400">Loading groups...</div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto mt-2 px-2">
        {groups.map(group => (
          <div key={group.id} className="mb-4">
            {/* Group Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#343541] rounded-lg mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium text-sm">{group.name}</span>
                {group.role === 'admin' && (
                  <span className="text-xs bg-[#19c37d] text-white px-1 rounded">Admin</span>
                )}
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleNewGroupSession(group.id)}
                  className="text-gray-400 hover:text-white"
                  title="New group chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {/* Group Sessions */}
            <div className="ml-4 space-y-1">
              {(groupSessions[group.id] || []).map(session => (
                <div
                  key={session.id}
                  className={`group flex items-center justify-between px-3 py-2 cursor-pointer truncate rounded-lg text-sm ${
                    activeGroupId === group.id && activeSessionId === session.id
                      ? 'bg-[#343541] font-medium' 
                      : 'hover:bg-[#2c2d36] text-gray-300'
                  }`}
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setActiveSessionId(session.id);
                  }}
                >
                  <span className="truncate">
                    {renamingId === session.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameGroupSession(group.id, session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameGroupSession(group.id, session.id);
                          } else if (e.key === 'Escape') {
                            setRenamingId(null);
                            setRenameValue("");
                          }
                        }}
                        className="bg-transparent border-none outline-none text-white w-full"
                        autoFocus
                      />
                    ) : (
                      session.name
                    )}
                  </span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(session.id);
                        setRenameValue(session.name);
                      }}
                      className="text-gray-400 hover:text-white"
                      title="Rename"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteGroupSession(group.id, session.id, e)}
                      className="text-gray-400 hover:text-red-400"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {(!groupSessions[group.id] || groupSessions[group.id].length === 0) && (
                <div className="text-xs text-gray-500 px-3 py-2">
                  No group chats yet
                </div>
              )}
            </div>
          </div>
        ))}
        
        {groups.length === 0 && (
          <div className="text-center text-gray-400 text-sm px-4 py-8">
            No groups available. Ask an admin to add you to a group.
          </div>
        )}
      </div>
    </aside>
  );
}

export default GroupSidebar; 