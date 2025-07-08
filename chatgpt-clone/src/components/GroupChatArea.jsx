import React, { useState, useRef, useEffect } from 'react';

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

function GroupMessageBubble({ message, currentUserId }) {
  const isAI = message.role === 'assistant';
  const isCurrentUser = !isAI && message.user?.id === currentUserId;
  return (
    <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
        {!isCurrentUser && (
          <div className="text-xs text-gray-400 mb-1 ml-1">
            {isAI ? 'ai' : (message.user?.name || message.user?.email)}
          </div>
        )}
        <div 
          className={`px-4 py-3 rounded-xl font-inter text-sm leading-relaxed ${
            isCurrentUser 
              ? 'bg-[#19c37d] text-white' 
              : isAI
                ? 'bg-blue-500 text-white'
                : 'bg-[#444654] text-white'
          }`}
        >
          <div className="whitespace-pre-wrap">
            {message.content}
            {message.code && <CodeBlock code={message.code} />}
          </div>
        </div>
        <div className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'text-right mr-1' : 'ml-1'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function GroupChatArea({ 
  messages, 
  onSend, 
  isTyping = false, 
  currentUserId,
  groupName,
  sessionName 
}) {
  const [input, setInput] = useState('');
  const [askBot, setAskBot] = useState(false);
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
    onSend(input, askBot);
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
    <div className="flex flex-col h-full min-h-0 bg-[#343541]">
      {/* Header */}
      <div className="bg-[#444654] border-b border-[#565869] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div>
            <div className="font-medium text-white">{groupName}</div>
            <div className="text-sm text-gray-400">{sessionName}</div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 lg:px-16 py-8">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center mt-20 font-inter text-lg">
            Start a group conversation! Messages will be visible to all group members.
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, idx) => (
              <GroupMessageBubble 
                key={idx} 
                message={msg} 
                currentUserId={currentUserId}
              />
            ))}
            {isTyping && (
              <div className="flex mb-4 justify-start">
                <div className="max-w-[75%]">
                  <div className="text-xs text-gray-400 mb-1 ml-1">AI Assistant</div>
                  <div className="bg-[#444654] text-white px-4 py-3 rounded-xl">
                    <TypingDots />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#343541] border-t border-[#565869] px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* User/Bot Toggle */}
          <div className="flex items-center mb-2 justify-end">
            <span className={`mr-2 text-xs font-medium ${askBot ? 'text-[#19c37d]' : 'text-gray-400'}`}>{askBot ? 'Ask Bot' : 'Chat with Team'}</span>
            <button
              onClick={() => setAskBot(v => !v)}
              className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${askBot ? 'bg-[#19c37d]' : 'bg-[#565869]'}`}
              title={askBot ? 'Switch to team chat' : 'Switch to bot'}
            >
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform duration-200 ${askBot ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="w-full px-4 py-3 pr-12 bg-[#40414f] text-white rounded-lg border border-[#565869] focus:outline-none focus:ring-2 focus:ring-[#19c37d] resize-none font-inter text-sm"
              style={{ minHeight: '44px', maxHeight: '200px' }}
            />
            <button
              ref={inputRef}
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-[#19c37d] text-white rounded-lg hover:bg-[#15a367] disabled:bg-[#565869] disabled:cursor-not-allowed transition font-inter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupChatArea; 