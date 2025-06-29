import React, { useState } from 'react';

const API_BASE = "http://localhost:4000/api";

function Sidebar({ sessions, activeSessionId, setActiveSessionId, onNewChat, isVisible, user, token, onSessionUpdate, onSessionDelete }) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  if (!isVisible) return null;

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete session');
      if (onSessionDelete) onSessionDelete(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    }
  };

  const handleRenameSession = async (sessionId) => {
    if (!renameValue.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: renameValue })
      });
      if (!response.ok) throw new Error('Failed to rename session');
      const updatedSession = await response.json();
      setRenamingId(null);
      setRenameValue("");
      if (onSessionUpdate) onSessionUpdate(updatedSession);
    } catch (error) {
      console.error('Error renaming session:', error);
      alert('Failed to rename session');
    }
  };

  return (
    <aside className="flex flex-col h-full w-64 bg-[#202123] text-white border-r border-[#565869]">
      <div className="p-4 border-b border-[#565869]">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#343541] hover:bg-[#40414f] rounded-lg transition font-inter font-medium"
          onClick={onNewChat}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto mt-2 px-2">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`group flex items-center justify-between px-3 py-2 cursor-pointer truncate rounded-lg mb-1 font-inter text-sm ${
              activeSessionId === session.id 
                ? 'bg-[#343541] font-medium' 
                : 'hover:bg-[#2c2d36] text-gray-300'
            }`}
            onClick={() => setActiveSessionId(session.id)}
          >
            {renamingId === session.id ? (
              <>
                <input
                  className="bg-[#40414f] text-white px-2 py-1 rounded border border-[#565869] w-24 mr-2"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameSession(session.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  autoFocus
                />
                <button
                  className="text-xs text-[#19c37d] mr-1"
                  onClick={e => { e.stopPropagation(); handleRenameSession(session.id); }}
                >Save</button>
                <button
                  className="text-xs text-gray-400"
                  onClick={e => { e.stopPropagation(); setRenamingId(null); }}
                >Cancel</button>
              </>
            ) : (
              <>
                <span className="truncate flex-1">{session.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#565869] rounded transition-opacity mr-1"
                  title="Rename chat"
                  onClick={e => { e.stopPropagation(); setRenamingId(session.id); setRenameValue(session.name); }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m2 2l-6 6" />
                  </svg>
                </button>
                <button
                  onClick={e => handleDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#565869] rounded transition-opacity"
                  title="Delete chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-[#565869] mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center font-bold text-white text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <span className="text-sm font-inter text-gray-300">{user?.name || user?.email}</span>
            {user?.role === 'admin' && (
              <div className="text-xs text-[#19c37d] font-medium">Admin</div>
            )}
          </div>
        </div>
        <button className="w-full text-left text-xs text-gray-400 hover:text-white font-inter">
          Settings
        </button>
      </div>
    </aside>
  );
}

export default Sidebar; 