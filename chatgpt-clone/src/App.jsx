import { useState, useRef, useEffect } from 'react'
import ChatGPTClone from './ChatGPTClone';

const API_BASE = "http://localhost:4000/api";

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#343541]">
      <form onSubmit={handleSubmit} className="bg-[#444654] p-8 rounded-lg shadow-lg w-96 border border-[#565869]">
        <h2 className="text-2xl font-bold mb-6 text-center text-white font-inter">Sign in to ChatGPT</h2>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300 font-inter">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-[#565869] rounded-lg bg-[#40414f] text-white focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300 font-inter">Password</label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-[#565869] rounded-lg bg-[#40414f] text-white focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="mb-4 text-red-400 text-sm font-inter">{error}</div>}
        <button type="submit" className="w-full bg-[#19c37d] text-white py-2 rounded-lg hover:bg-[#15a367] transition font-inter font-medium">Sign In</button>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="relative my-4">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#565869] text-white rounded hover:bg-[#676a7d] transition"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="bg-[#202123] text-white p-3 rounded-lg overflow-x-auto font-mono text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageBubble({ message, isTyping = false }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[75%] px-4 py-3 rounded-xl font-inter text-sm leading-relaxed ${
          isUser 
            ? 'bg-[#19c37d] text-white' 
            : 'bg-[#444654] text-white'
        }`}
      >
        {isTyping ? (
          <TypingDots />
        ) : (
          <div className="whitespace-pre-wrap">
            {message.content}
            {message.code && <CodeBlock code={message.code} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({ sessions, activeSessionId, setActiveSessionId, onNewChat, isVisible }) {
  if (!isVisible) return null;

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
            className={`px-3 py-2 cursor-pointer truncate rounded-lg mb-1 font-inter text-sm ${
              activeSessionId === session.id 
                ? 'bg-[#343541] font-medium' 
                : 'hover:bg-[#2c2d36] text-gray-300'
            }`}
            onClick={() => setActiveSessionId(session.id)}
          >
            {session.name}
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-[#565869] mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#19c37d] flex items-center justify-center font-bold text-white text-sm">
            U
          </div>
          <span className="text-sm font-inter text-gray-300">user@example.com</span>
        </div>
        <button className="w-full text-left text-xs text-gray-400 hover:text-white font-inter">
          Settings
        </button>
      </div>
    </aside>
  );
}

function ChatArea({ messages, onSend, isTyping = false }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#343541]">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-8">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center mt-20 font-inter text-lg">
            ChatGPT can answer questions, explain code, and more. Start a conversation!
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {isTyping && <MessageBubble message={{ role: 'assistant', content: '' }} isTyping={true} />}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#343541] border-t border-[#565869] px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full resize-none px-4 py-3 rounded-xl border border-[#565869] bg-[#40414f] text-white focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter text-sm leading-relaxed min-h-[48px] max-h-[200px]"
              placeholder="Message ChatGPT..."
              value={input}
              rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ cursor: 'text' }}
            />
            <button
              className="absolute bottom-3 right-3 bg-[#19c37d] hover:bg-[#15a367] text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSend}
              disabled={!input.trim()}
              style={{ cursor: 'pointer' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-gray-400 text-center mt-3 font-inter">
            ChatGPT can make mistakes. Consider checking important information.
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ token, setPage, onLogout }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', selectedUsers: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  
  const handleGroupChange = e => {
    const { name, value } = e.target;
    if (name === 'selectedUsers') {
      // Handle checkbox selection
      const userId = parseInt(value);
      setGroupForm(f => ({
        ...f,
        selectedUsers: f.selectedUsers.includes(userId)
          ? f.selectedUsers.filter(id => id !== userId)
          : [...f.selectedUsers, userId]
      }));
    } else {
      setGroupForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleCreate = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setSuccess('User created!');
      setForm({ email: '', password: '', name: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateGroup = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(groupForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      setSuccess('Group chat created!');
      setGroupForm({ name: '', description: '', selectedUsers: [] });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#343541] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <button 
            onClick={() => setPage('chat')} 
            className="bg-[#19c37d] text-white px-4 py-2 rounded hover:bg-[#15a367] transition font-inter"
          >
            Back to Chat
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create User Form */}
          <div className="bg-[#444654] p-6 rounded-lg border border-[#565869]">
            <h3 className="font-semibold mb-4 text-lg">Create User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input 
                  name="email" 
                  type="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 rounded bg-[#40414f] text-white border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input 
                  name="password" 
                  type="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 rounded bg-[#40414f] text-white border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 rounded bg-[#40414f] text-white border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select 
                  name="role" 
                  value={form.role} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 rounded bg-[#40414f] text-white border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <div className="text-red-400 text-sm font-inter">{error}</div>}
              {success && <div className="text-green-400 text-sm font-inter">{success}</div>}
              <button type="submit" className="bg-[#19c37d] text-white px-6 py-2 rounded hover:bg-[#15a367] transition font-inter font-medium">
                Create User
              </button>
            </form>
          </div>

          {/* Create Group Form */}
          <div className="bg-[#444654] p-6 rounded-lg border border-[#565869]">
            <h3 className="font-semibold mb-4 text-lg">Create Group Chat</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Group Name</label>
                <input 
                  name="name" 
                  value={groupForm.name} 
                  onChange={handleGroupChange} 
                  placeholder="Enter group name" 
                  className="w-full px-3 py-2 rounded bg-[#40414f] text-white border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea 
                  name="description" 
                  value={groupForm.description} 
                  onChange={handleGroupChange} 
                  placeholder="Enter group description" 
                  className="w-full px-3 py-2 rounded bg-[#40414f] text-white border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] font-inter resize-none" 
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Members</label>
                <div className="max-h-40 overflow-y-auto space-y-2 bg-[#40414f] p-3 rounded border border-[#565869]">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="selectedUsers"
                        value={user.id}
                        checked={groupForm.selectedUsers.includes(user.id)}
                        onChange={handleGroupChange}
                        className="rounded border-[#565869] bg-[#40414f] text-[#19c37d] focus:ring-[#19c37d]"
                      />
                      <span className="text-sm">
                        {user.name || user.email} 
                        {user.role === 'admin' && (
                          <span className="text-[#19c37d] ml-1">(Admin)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Selected: {groupForm.selectedUsers.length} users
                </p>
              </div>
              <button type="submit" className="bg-[#19c37d] text-white px-6 py-2 rounded hover:bg-[#15a367] transition font-inter font-medium">
                Create Group Chat
              </button>
            </form>
          </div>
        </div>

        {/* Users List */}
        <div className="mt-8 bg-[#444654] p-6 rounded-lg border border-[#565869]">
          <h3 className="font-semibold mb-4 text-lg">All Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#565869]">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-[#565869]">
                    <td className="py-2">{user.name || 'N/A'}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' 
                          ? 'bg-[#19c37d] text-white' 
                          : 'bg-[#565869] text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('chat');

  // Restore token and user from localStorage on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (jwt, userInfo) => {
    setToken(jwt);
    setUser(userInfo);
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userInfo));
    setPage(userInfo.role === 'admin' ? 'admin' : 'chat');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPage('chat');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!token) return <Login onLogin={handleLogin} />;

  if (page === 'admin') return <AdminDashboard token={token} setPage={setPage} onLogout={handleLogout} />;

  return (
    <ChatGPTClone user={user} token={token} onLogout={handleLogout} onAdminDashboard={() => setPage('admin')} />
  );
}
