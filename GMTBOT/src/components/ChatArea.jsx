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
    <div className="flex flex-col h-full min-h-0 bg-[#343541]">
      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 lg:px-16 py-8">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center mt-20 font-inter text-lg">
            GMTBOT can answer questions, explain code, and more. Start a conversation!
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
              placeholder="Message GMTBOT..."
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
            GMTBOT can make mistakes. Consider checking important information.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatArea; 