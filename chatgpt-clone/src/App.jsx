import { useState, useRef, useEffect } from 'react'

const LANGFLOW_API_URL = "https://langflowbubblemvp-production.up.railway.app/api/v1/run/c0504846-5aeb-4bde-b8a9-19185e33f7a3";

// Mock user for login
const MOCK_USER = { email: 'latifmuda12@gmail.com', password: 'password' };

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === MOCK_USER.email && password === MOCK_USER.password) {
      onLogin();
    } else {
      setError('Invalid credentials');
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

function ChatGPTClone() {
  const [sessions, setSessions] = useState([
    { id: 1, name: 'New Chat', messages: [] },
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleSend = async (input) => {
    const userMsg = { role: 'user', content: input };
    setSessions(sessions => sessions.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, userMsg] }
        : s
    ));
    setIsTyping(true);

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
      console.log("Langflow API response:", data);
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
      const botMsg = { role: 'assistant', content: aiContent };
      setSessions(sessions => sessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, botMsg] }
          : s
      ));
    } catch (err) {
      const botMsg = { role: 'assistant', content: `Error: ${err.message}` };
      setSessions(sessions => sessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, botMsg] }
          : s
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    const newId = sessions.length ? Math.max(...sessions.map(s => s.id)) + 1 : 1;
    setSessions([...sessions, { id: newId, name: `Chat ${newId}`, messages: [] }]);
    setActiveSessionId(newId);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#343541]">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        onNewChat={handleNewChat}
        isVisible={sidebarVisible}
      />
      
      <main className="flex-1 flex flex-col h-full">
        {/* Header with toggle button */}
        <div className="bg-[#343541] border-b border-[#565869] px-4 py-3 flex items-center">
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-2 rounded-lg hover:bg-[#40414f] transition"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-white font-inter font-medium">ChatGPT</h1>
        </div>
        
        <ChatArea
          messages={activeSession.messages}
          onSend={handleSend}
          isTyping={isTyping}
        />
      </main>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  return loggedIn ? <ChatGPTClone /> : <Login onLogin={() => setLoggedIn(true)} />;
}
