import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from "../AuthContext";
import { API_ENDPOINTS } from '../../config/api';
import { Bot, Sparkles, MessageCircle, Zap, Send, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const Homer: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(true);
  const [typewriterStates, setTypewriterStates] = useState<{[key: string]: string}>({});
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message and turn off organizing after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOrganizing(false);
      setMessages([
        {
          id: '1',
          content: 'Welcome back! I can now search through your email history and provide contextual insights. Try asking me about customer patterns, recent conversations, or business trends.',
          sender: 'assistant',
          timestamp: new Date()
        }
      ]);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typewriterStates]);

  // Typewriter effect for agent messages
  const startTypewriter = (messageId: string, fullText: string) => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypewriterStates(prev => ({
          ...prev,
          [messageId]: fullText.slice(0, currentIndex)
        }));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 15);
  };

  // Get conversation history for context
  const getConversationHistory = () => {
    return messages.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };

  // Handle sending messages to AI
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Use the same AI endpoint pattern as CommandBChat
      const response = await fetch('https://beya-polling-nlb-3031d63a230444c0.elb.us-east-1.amazonaws.com:2075/api/v1/query-with-ai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentQuery,
          userId: user?.userId || null,
          responseType: 'auto',
          topK: 5,
          conversationHistory: getConversationHistory(),
          currentContext: 'home-dashboard',
          enhancedMode: true
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || data.answer || 'I\'m sorry, I couldn\'t find relevant information for your query.',
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Start typewriter effect
      startTypewriter(assistantMessage.id, assistantMessage.content);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#FFFBFA',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '40px 60px',
        background: '#FFFBFA',
      }}>
        {messages.map((message) => {
          const isTypewriter = typewriterStates[message.id] !== undefined;
          const displayContent = isTypewriter ? typewriterStates[message.id] : message.content;
          
          return (
            <div
              key={message.id}
              style={{
                marginBottom: '24px',
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: '12px',
                maxWidth: '1200px',
                margin: '0 auto 24px auto',
              }}
            >
              {message.sender === 'assistant' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, #DE1785 0%, #C91476 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Bot size={18} color="white" />
                </div>
              )}
              
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: message.sender === 'user' ? '#DE1785' : '#FFFFFF',
                  color: message.sender === 'user' ? '#FFFFFF' : '#374151',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  wordWrap: 'break-word',
                  border: '1px solid #E5E7EB',
                }}
              >
                {displayContent}
                {isTypewriter && displayContent.length < message.content.length && (
                  <span style={{
                    opacity: 0.7,
                    animation: 'blink 1s infinite'
                  }}>|</span>
                )}
              </div>

              {message.sender === 'user' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: '#F3F4F6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '2px solid #E5E7EB',
                }}>
                  <User size={18} color="#6B7280" />
                </div>
              )}
            </div>
          );
        })}
        
        {isTyping && (
          <div style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'flex-start',
            gap: '12px',
            maxWidth: '1200px',
            margin: '0 auto 24px auto',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #DE1785 0%, #C91476 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              background: '#F3F4F6',
              color: '#6B7280',
              fontSize: '15px',
              fontStyle: 'italic',
              border: '1px solid #E5E7EB',
            }}>
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px 60px 40px',
        background: '#FFFBFA',
        borderTop: '1px solid #E5E7EB',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isOrganizing ? "AI is organizing your data..." : "Ask about your business, customers, or insights..."}
            disabled={isOrganizing}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '15px',
              outline: 'none',
              background: isOrganizing ? '#F9FAFB' : '#FFFFFF',
              color: isOrganizing ? '#9CA3AF' : '#374151',
              cursor: isOrganizing ? 'not-allowed' : 'text',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              if (!isOrganizing) {
                e.target.style.borderColor = '#DE1785';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isOrganizing}
            style={{
              padding: '12px',
              background: (inputValue.trim() && !isOrganizing) ? 'linear-gradient(135deg, #DE1785 0%, #C91476 100%)' : '#E5E7EB',
              color: (inputValue.trim() && !isOrganizing) ? '#FFFFFF' : '#9CA3AF',
              border: 'none',
              borderRadius: '12px',
              cursor: (inputValue.trim() && !isOrganizing) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={18} />
          </button>
        </div>
        
        <p style={{
          margin: '12px 0 0 0',
          fontSize: '13px',
          color: '#9CA3AF',
          textAlign: 'center',
          maxWidth: '1200px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Press Enter to send • Powered by Beya AI
        </p>
      </div>

      {/* Animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

export default Homer;