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
    <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: '#DE1785' }}>
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H13V9H21ZM20.5 12C22.43 12 24 13.57 24 15.5C24 17.43 22.43 19 20.5 19C18.57 19 17 17.43 17 15.5C17 13.57 18.57 12 20.5 12ZM20.5 17.5C21.6 17.5 22.5 16.6 22.5 15.5C22.5 14.4 21.6 13.5 20.5 13.5C19.4 13.5 18.5 14.4 18.5 15.5C18.5 16.6 19.4 17.5 20.5 17.5Z"/>
    </svg>
  );

  const SendIcon = () => (
    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'white' }}>
      <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'white' }}>
      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
    </svg>
  );

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
    ::-webkit-scrollbar {
      width: 6px;
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: 6px;
    }
  `;

  // Inline style objects
  const fixedButtonContainer: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    left: 100,
    zIndex: 50,
  };

  const aiButton: React.CSSProperties = {
    width: 56,
    height: 56,
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '50%',
    cursor: 'pointer',
    boxShadow: '0 4px 16px 0 rgba(0,0,0,0.08)',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    ...(isExpanded
      ? { opacity: 0, pointerEvents: 'none', transform: 'scale(0)' }
      : { opacity: 1, transform: 'scale(1)', animation: 'pulseGlow 2s ease-in-out infinite' }),
  };

  const chatBox: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    background: 'white',
    borderRadius: isExpanded ? 20 : 28,
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
    transformOrigin: 'bottom left',
    width: isExpanded ? 450 : 56,
    height: isExpanded ? 450 : 56,
    opacity: isExpanded ? 1 : 0,
    pointerEvents: isExpanded ? 'auto' : 'none',
    transform: isExpanded ? 'scale(1)' : 'scale(0)',
  };

  const chatHeader: React.CSSProperties = {
    color: 'white',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    transition: 'all 0.3s',
    position: 'relative',
    background: 'linear-gradient(135deg, #DE1785 0%, #E74C9F 100%)',
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? 'translateY(0)' : 'translateY(-20px)',
    transitionDelay: isExpanded ? '0.2s' : '0s',
  };

  const closeButton: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s',
    outline: 'none',
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? 'scale(1)' : 'scale(0)',
    transitionDelay: isExpanded ? '0.2s' : '0s',
  };

  const chatMessages: React.CSSProperties = {
    flex: 1,
    padding: 20,
    overflowY: 'auto',
    transition: 'all 0.3s',
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? 'translateY(0)' : 'translateY(20px)',
    transitionDelay: isExpanded ? '0.3s' : '0s',
    scrollbarWidth: 'thin',
    scrollbarColor: '#DE1785 transparent',
  };

  const chatInputContainer: React.CSSProperties = {
    padding: 20,
    borderTop: '1px solid #e5e7eb',
    transition: 'all 0.3s',
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? 'translateY(0)' : 'translateY(20px)',
    transitionDelay: isExpanded ? '0.5s' : '0s',
  };

  const inputRow: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: 9999,
    outline: 'none',
    fontSize: 14,
    transition: 'all 0.2s',
    boxShadow: isExpanded ? '0 0 0 1px rgba(222, 23, 133, 0.1)' : 'none',
  };

  const sendButton: React.CSSProperties = {
    width: 40,
    height: 40,
    border: 'none',
    borderRadius: '50%',
    cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    background: !inputValue.trim()
      ? '#f3f4f6'
      : 'linear-gradient(135deg, #DE1785 0%, #E74C9F 100%)',
    opacity: inputValue.trim() ? 1 : 0.5,
    pointerEvents: inputValue.trim() ? 'auto' : 'none',
  };

  const emptyState: React.CSSProperties = {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 64,
  };

  const emptyIcon: React.CSSProperties = {
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'center',
  };

  const emptyText: React.CSSProperties = {
    fontSize: 14,
  };

  const emptyHint: React.CSSProperties = {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.6,
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div style={fixedButtonContainer}>
        <button
          onClick={handleToggleChat}
          style={aiButton}
          title="AI Assistant (⌘+B)"
        >
          <AIIcon />
        </button>
        <div style={chatBox}>
          {/* Chat Header */}
          <div style={chatHeader}>
            <div style={{ width: 20, height: 20 }}>
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'white' }}>
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H13V9H21ZM20.5 12C22.43 12 24 13.57 24 15.5C24 17.43 22.43 19 20.5 19C18.57 19 17 17.43 17 15.5C17 13.57 18.57 12 20.5 12ZM20.5 17.5C21.6 17.5 22.5 16.6 22.5 15.5C22.5 14.4 21.6 13.5 20.5 13.5C19.4 13.5 18.5 14.4 18.5 15.5C18.5 16.6 19.4 17.5 20.5 17.5Z"/>
              </svg>
            </div>
            <h3 style={{ fontWeight: 600, margin: 0 }}>AI Assistant</h3>
            <div style={{ fontSize: 12, opacity: 0.75, marginLeft: 'auto' }}>⌘+B</div>
            <button
              onClick={handleToggleChat}
              style={closeButton}
            >
              <CloseIcon />
            </button>
          </div>
          {/* Chat Messages */}
          <div style={chatMessages}>
            {messages.length === 0 && (
              <div style={emptyState}>
                <div style={emptyIcon}>
                  <div style={{ width: 32, height: 32 }}>
                    <AIIcon />
                  </div>
                </div>
                <p style={emptyText}>Hello! How can I assist you today?</p>
                <p style={emptyHint}>Press ⌘+B to toggle</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={message.id}
                style={{
                  marginBottom: 16,
                  textAlign: message.sender === 'user' ? 'right' : 'left',
                  opacity: 0,
                  transform: 'translateY(10px)',
                  animation: `slideInMessage 0.3s ease ${index * 0.1}s forwards`
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: 20,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: message.sender === 'user' ? 'white' : '#374151',
                    background: message.sender === 'user'
                      ? 'linear-gradient(135deg, #DE1785 0%, #E74C9F 100%)'
                      : '#f3f4f6',
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Chat Input */}
          <div style={chatInputContainer}>
            <div style={inputRow}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                style={inputStyle}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                style={sendButton}
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