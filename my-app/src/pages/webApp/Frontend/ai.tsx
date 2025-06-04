import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AIChatCircle: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [messageId, setMessageId] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [isExpanded]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggleChat = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messageId,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessageId(prev => prev + 1);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: messageId + 1,
        text: `I received your message: "${inputValue}". How can I help you further?`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setMessageId(prev => prev + 1);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const AIIcon = () => (
    <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ fill: '#DE1785' }}>
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H13V9H21ZM20.5 12C22.43 12 24 13.57 24 15.5C24 17.43 22.43 19 20.5 19C18.57 19 17 17.43 17 15.5C17 13.57 18.57 12 20.5 12ZM20.5 17.5C21.6 17.5 22.5 16.6 22.5 15.5C22.5 14.4 21.6 13.5 20.5 13.5C19.4 13.5 18.5 14.4 18.5 15.5C18.5 16.6 19.4 17.5 20.5 17.5Z"/>
    </svg>
  );

  const SendIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
      <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
    </svg>
  );

  // Create animation styles
  const animationStyles = `
    @keyframes slideInMessage {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pulseGlow {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(222, 23, 133, 0.4);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(222, 23, 133, 0);
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      
      {/* AI Circle Button - Fixed Position Bottom Left */}
      <div className="fixed bottom-6 left-25 z-50">
        <button
          onClick={handleToggleChat}
          className={`w-14 h-14 bg-white border-2 border-gray-200 rounded-full cursor-pointer shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-110 hover:shadow-xl hover:border-pink-200 group ${
            isExpanded ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100 scale-100'
          }`}
          style={{
            animation: isExpanded ? 'none' : 'pulseGlow 2s ease-in-out infinite'
          }}
          title="AI Assistant (⌘+B)"
        >
          <AIIcon />
        </button>

        {/* Chat Box */}
        <div
          className={`absolute bottom-0 left-0 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ease-out transform-gpu ${
            isExpanded
              ? 'w-[450px] h-[450px] rounded-xl opacity-100 pointer-events-auto scale-100'
              : 'w-14 h-14 opacity-0 pointer-events-none scale-0'
          }`}
          style={{ transformOrigin: 'bottom left' }}
        >
          {/* Chat Header */}
          <div
            className={`text-white px-5 py-4 flex items-center gap-3 transition-all duration-300 relative ${
              isExpanded ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-5'
            }`}
            style={{
              background: 'linear-gradient(135deg, #DE1785 0%, #E74C9F 100%)'
            }}
          >
            <div className="w-5 h-5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H13V9H21ZM20.5 12C22.43 12 24 13.57 24 15.5C24 17.43 22.43 19 20.5 19C18.57 19 17 17.43 17 15.5C17 13.57 18.57 12 20.5 12ZM20.5 17.5C21.6 17.5 22.5 16.6 22.5 15.5C22.5 14.4 21.6 13.5 20.5 13.5C19.4 13.5 18.5 14.4 18.5 15.5C18.5 16.6 19.4 17.5 20.5 17.5Z"/>
              </svg>
            </div>
            <h3 className="font-semibold">AI Assistant</h3>
            <div className="text-xs opacity-75 ml-auto">⌘+B</div>
            
            {/* Close Button */}
            <button
              onClick={handleToggleChat}
              className={`absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 border-none rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 hover:bg-opacity-30 ${
                isExpanded ? 'opacity-100 scale-100 delay-200' : 'opacity-0 scale-0'
              }`}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Chat Messages */}
          <div
            className={`flex-1 p-5 overflow-y-auto transition-all duration-300 ${
              isExpanded ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-5'
            }`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#DE1785 transparent'
            }}
          >
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-16">
                <div className="mb-4 flex justify-center">
                  <div className="w-8 h-8">
                    <AIIcon />
                  </div>
                </div>
                <p className="text-sm">Hello! How can I assist you today?</p>
                <p className="text-xs mt-2 opacity-60">Press ⌘+B to toggle</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
                style={{
                  opacity: 0,
                  transform: 'translateY(10px)',
                  animation: `slideInMessage 0.3s ease ${index * 0.1}s forwards`
                }}
              >
                <div
                  className={`inline-block max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    message.sender === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  style={
                    message.sender === 'user'
                      ? { background: 'linear-gradient(135deg, #DE1785 0%, #E74C9F 100%)' }
                      : {}
                  }
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div
            className={`p-5 border-t border-gray-200 transition-all duration-300 ${
              isExpanded ? 'opacity-100 translate-y-0 delay-500' : 'opacity-0 translate-y-5'
            }`}
          >
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full outline-none text-sm transition-all focus:border-pink-400"
                style={{
                  boxShadow: isExpanded ? '0 0 0 1px rgba(222, 23, 133, 0.1)' : 'none'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="w-10 h-10 border-none rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: !inputValue.trim() 
                    ? '#f3f4f6' 
                    : 'linear-gradient(135deg, #DE1785 0%, #E74C9F 100%)'
                }}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatCircle;