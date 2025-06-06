// src/ui/AIChatCircle.tsx
import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';

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
    setIsExpanded(prev => !prev);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messageId,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessageId(prev => prev + 1);
    setInputValue('');

    setTimeout(() => {
      const aiMessage: Message = {
        id: messageId + 1,
        text: `I received your message: "${inputValue}". How can I help you further?`,
        sender: 'ai',
        timestamp: new Date(),
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
    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#DE1785]">
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

  return (
    <>
      {/* Inject custom keyframes and scrollbar styling */}
      <style>{`
        @keyframes slideInMessage {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(222, 23, 133, 0.4); }
          50%    { box-shadow: 0 0 0 10px rgba(222, 23, 133, 0); }
        }
        ::-webkit-scrollbar {
          width: 6px; background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          border-radius: 6px;
        }
      `}</style>

      {/* Floating Button + Chat Box Container */}
      <div className="fixed bottom-[24px] left-[100px] z-50">
        {/* Collapsed Chat Button */}
        <button
          onClick={handleToggleChat}
          title="AI Assistant (⌘+B)"
          className={classNames(
            'w-[56px] h-[56px] bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 outline-none',
            {
              'opacity-0 pointer-events-none scale-0': isExpanded,
              'opacity-100 scale-100 animate-[pulseGlow_2s_ease-in-out_infinite]': !isExpanded,
            }
          )}
        >
          <AIIcon />
        </button>

        {/* Chat Box */}
        <div
          className={classNames(
            'absolute bottom-0 left-0 bg-white flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] origin-bottom-left',
            {
              'w-[450px] h-[450px] opacity-100 pointer-events-auto scale-100 rounded-[20px]': isExpanded,
              'w-[56px] h-[56px] opacity-0 pointer-events-none scale-0 rounded-[28px]': !isExpanded,
            }
          )}
        >
          {/* Chat Header */}
          <div
            className={classNames(
              'text-white px-5 py-4 flex items-center gap-3 relative bg-gradient-to-r from-[#DE1785] to-[#E74C9F] transition-all duration-300',
              {
                'opacity-100 translate-y-0 delay-200': isExpanded,
                'opacity-0 -translate-y-5': !isExpanded,
              }
            )}
          >
            <div className="w-5 h-5">
              <AIIcon />
            </div>
            <h3 className="font-semibold m-0">AI Assistant</h3>
            <div className="text-xs opacity-75 ml-auto">⌘+B</div>
            <button
              onClick={handleToggleChat}
              className={classNames(
                'absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 outline-none',
                {
                  'opacity-100 scale-100 delay-200': isExpanded,
                  'opacity-0 scale-0': !isExpanded,
                }
              )}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Chat Messages */}
          <div
            className={classNames(
              'flex-1 p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 transition-all duration-300',
              {
                'opacity-100 translate-y-0 delay-300': isExpanded,
                'opacity-0 translate-y-5': !isExpanded,
              }
            )}
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-16">
                <div className="mb-4 flex justify-center">
                  <div className="w-8 h-8">
                    <AIIcon />
                  </div>
                </div>
                <p className="text-base">Hello! How can I assist you today?</p>
                <p className="text-xs mt-2 opacity-60">Press ⌘+B to toggle</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className="mb-4"
                  style={{
                    textAlign: message.sender === 'user' ? 'right' : 'left',
                    opacity: 0,
                    transform: 'translateY(10px)',
                    animation: `slideInMessage 0.3s ease ${index * 0.1}s forwards`,
                  }}
                >
                  <div
                    className={classNames(
                      'inline-block max-w-[80%] px-4 py-3 rounded-[20px] text-sm leading-snug',
                      {
                        'text-white bg-gradient-to-r from-[#DE1785] to-[#E74C9F]': message.sender === 'user',
                        'text-gray-800 bg-gray-100': message.sender === 'ai',
                      }
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div
            className={classNames(
              'p-5 border-t border-gray-200 transition-all duration-300',
              {
                'opacity-100 translate-y-0 delay-500': isExpanded,
                'opacity-0 translate-y-5': !isExpanded,
              }
            )}
          >
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm outline-none focus:ring-1 focus:ring-pink-300 transition-shadow duration-200"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className={classNames(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
                  {
                    'bg-gray-200 cursor-not-allowed': !inputValue.trim(),
                    'bg-gradient-to-r from-[#DE1785] to-[#E74C9F]': inputValue.trim(),
                  }
                )}
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