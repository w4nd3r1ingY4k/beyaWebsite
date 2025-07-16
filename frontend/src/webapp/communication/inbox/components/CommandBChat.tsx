import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from "@/webapp/AuthContext";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isGhost?: boolean;
}

interface CommandBChatProps {
  onClose: () => void;
  initialMessage?: string | null;
  width?: number;
  disableCmdBShortcut?: boolean;
}

interface ProactiveInsight {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

const CommandBChat: React.FC<CommandBChatProps> = ({ onClose, initialMessage, width = 280, disableCmdBShortcut = false }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(true);
  const [typewriterStates, setTypewriterStates] = useState<{[key: string]: string}>({});
  
  // Mock tonality analysis feature
  const [showTonalityModal, setShowTonalityModal] = useState(false);
  
  // Short-term memory configuration
  const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages for context
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API Base URL - matches your backend server
  const API_BASE = 'http://localhost:2074';

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
    }, 15); // Faster typing speed
  };

  // Organizing sequence when component first mounts
  useEffect(() => {
    const organizingSequence = async () => {
      if (initialMessage) {
        // If there's an initial message, show the tonality analysis sequence
        const tonalityMessages = [
          { content: 'Thinking about your email chain...', delay: 2000 },
          { content: 'Thinking about MCPs and other important information...', delay: 2300 },
          { content: 'Creating a response...', delay: 500 },

          { 
            content: initialMessage, 
            delay: 600,
            isFinal: true
          }
        ];

        for (let i = 0; i < tonalityMessages.length; i++) {
          const msg = tonalityMessages[i];
          
          // Add delay before showing message
          await new Promise(resolve => setTimeout(resolve, msg.delay));
          
          const newMessage: Message = {
            id: `tonality-${i}`,
            content: msg.isFinal ? '' : msg.content, // Start empty for final message
            sender: 'assistant',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, newMessage]);
          
          // Handle different animation types
          if (msg.isFinal) {
            // Final message gets typewriter effect
            setTimeout(() => {
              startTypewriter(`tonality-${i}`, msg.content);
            }, 100);
          }
        }
      } else {
        // Original organizing sequence
        const organizingMessages = [
          { content: 'organizing myself...', delay: 1300 },
          { content: 'checking for important information...', delay: 1500 },
          { content: 'searching through your email history...', delay: 1400, isGhost: true },
          { 
            content: 'Welcome back! I can now search through your email history and provide contextual insights. Try asking me about customer patterns, recent conversations, or business trends.', 
            delay: 800,
            isFinal: true
          }
        ];

        for (let i = 0; i < organizingMessages.length; i++) {
          const msg = organizingMessages[i];
          
          // Add delay before showing message
          await new Promise(resolve => setTimeout(resolve, msg.delay));
          
          const newMessage: Message = {
            id: `organizing-${i}`,
            content: msg.isFinal ? '' : msg.content, // Start empty for final message
            sender: 'assistant',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, newMessage]);
          
          // Handle different animation types
          if (msg.isGhost) {
            // Ghost message fades after a moment
            setTimeout(() => {
              setMessages(prev => prev.map(m => 
                m.id === `organizing-${i}` 
                  ? { ...m, isGhost: true }
                  : m
              ));
            }, 1500);
          } else if (msg.isFinal) {
            // Final message gets typewriter effect
            setTimeout(() => {
              startTypewriter(`organizing-${i}`, msg.content);
            }, 100);
          }
        }
      }
      
      setIsOrganizing(false);
    };

    organizingSequence();
  }, [initialMessage]);

  // Add after organizingSequence, before useEffect for auto-focus
  // Add proactive insights state
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([]);

  // Fetch proactive insights when chat opens
  useEffect(() => {
    const fetchInsights = async () => {
      if (!user?.userId) return;
      try {
        const res = await fetch(`http://localhost:2074/api/v1/proactive-insights?userId=${user.userId}`);
        const data = await res.json();
        if (data.insights) {
          setProactiveInsights(data.insights);
          // Add each insight as an assistant message at the top (if not already present)
          setMessages(prev => [
            ...data.insights.map((insight: ProactiveInsight) => ({
              id: `insight-${insight.id}`,
              content: insight.message,
              sender: 'assistant',
              timestamp: new Date(insight.timestamp),
            })),
            ...prev
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch proactive insights', err);
      }
    };
    fetchInsights();
  }, [user?.userId]);

  // Auto-focus input when organizing is complete (with delay to prevent scroll)
  useEffect(() => {
    if (!isOrganizing) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOrganizing]);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const isAtBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 1;
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (disableCmdBShortcut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, disableCmdBShortcut]);

  // Helper function to get conversation history for context
  const getConversationHistory = () => {
    return messages
      .filter(msg => msg.content && msg.content.trim() !== '') // Filter out empty messages
      .slice(-MAX_CONVERSATION_HISTORY) // Use configurable history length
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
  };

  // Enhanced API integration with context-aware insights
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
      // Get current context (what page/section user is on)
      const currentContext = window.location.pathname.includes('/inbox') ? 'inbox-viewing' : 
                            window.location.pathname.includes('/crm') ? 'crm-section' : 
                            'general-navigation';

      // Call enhanced semantic search API with context awareness
      const response = await fetch(`${API_BASE}/api/v1/query-with-ai`, {
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
          currentContext: currentContext,
          enhancedMode: true // Enable enhanced context-aware mode
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Create assistant message with API response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '', // Keep empty for typewriter effect
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Start typewriter effect with the AI response
      setTimeout(() => {
        const responseText = data.aiResponse || 'I found some relevant information, but couldn\'t generate a response. Please try rephrasing your question.';
        startTypewriter(assistantMessage.id, responseText);
      }, 100);

      // Log enhanced context usage
      if (data.searchMetadata?.enhancedMode) {
        console.log('🔍 Enhanced context mode used:', {
          contextUsed: data.searchMetadata.contextUsed,
          totalResults: data.searchMetadata.totalResults
        });
      }

    } catch (error) {
      console.error('❌ Enhanced API call failed:', error);
      
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '', // Keep empty for typewriter effect
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
      
      // Start typewriter effect with error message
      setTimeout(() => {
        const errorText = 'Sorry, I\'m having trouble connecting to the enhanced context engine right now. Please try again.';
        startTypewriter(errorMessage.id, errorText);
      }, 100);
    }
  };

  // Clear conversation history (useful for starting fresh)
  const clearConversationHistory = () => {
    setMessages([]);
    setTypewriterStates({});
  };

  // Mock tonality analysis feature
  const handleTonalityCheck = () => {
    if (!inputValue.trim()) return;
    
    // Mock analysis - trigger warning for messages that seem too casual
    const casualIndicators = ['hey', 'sup', 'what\'s up', 'yo', 'dude', 'lol', 'haha'];
    const isCasual = casualIndicators.some(indicator => 
      inputValue.toLowerCase().includes(indicator)
    );
    
    if (isCasual) {
      setShowTonalityModal(true);
    } else {
      // If tonality is fine, proceed with normal sending
      handleSendMessage();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(); // UPDATED: Now calls real API
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 0.6; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .commandbchat-container {
          width: 100%;
          max-width: 600px;
          min-width: 0;
          height: 100%;
          background: #FFFBFA;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          margin-top: 24px;
        }
        @media (max-width: 700px) {
          .commandbchat-container {
            max-width: 100vw;
            margin-top: 8px;
            border-left: none;
            border-radius: 0;
          }
        }
        .commandbchat-header {
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
          background: #FBF7F7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        @media (max-width: 500px) {
          .commandbchat-header {
            padding: 10px;
          }
        }
        .commandbchat-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
          background: #FFFBFA;
          min-height: 0;
          scroll-behavior: smooth;
        }
        @media (max-width: 500px) {
          .commandbchat-messages {
            padding: 4px;
          }
        }
        .commandbchat-input {
          padding: 12px 12px 8px 12px;
          border-top: 1px solid #f0f0f0;
          background: #FBF7F7;
          flex-shrink: 0;
        }
        @media (max-width: 500px) {
          .commandbchat-input {
            padding: 8px 4px 4px 4px;
          }
        }
      `}</style>
      <div className="commandbchat-container">
        <div className="commandbchat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <div>
              <h3 style={{ margin: 0, fontWeight: '600', color: '#111827' }}>Chat with B</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Context-aware AI assistant</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#9ca3af' }}>
                Memory: {getConversationHistory().length}/{MAX_CONVERSATION_HISTORY} message
              </p>
            </div>
          </div>
        </div>
        {/* Messages Area */}
        <div className="commandbchat-messages">
          {messages.map(message => {
            const isThinking = message.content.includes('...');
            const isTypewriter = typewriterStates[message.id] !== undefined;
            const displayContent = isTypewriter ? typewriterStates[message.id] : message.content;
            
            // Don't render if it's an empty message waiting for typewriter
            if (message.content === '' && !isTypewriter) {
              return null;
            }
            
            let messageOpacity = 1;
            if (message.isGhost) {
              messageOpacity = 0.3;
            } else if (isThinking) {
              messageOpacity = 0.6;
            }
            
            return (
              <div
                key={message.id}
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  opacity: messageOpacity,
                  transition: isThinking ? 'opacity 1s ease-in' : 'opacity 0.5s ease',
                  animation: isThinking ? 'fadeIn 1s ease-in' : 'none'
                }}
              >
                {message.sender === 'user' ? (
                  <div
                    style={{
                      maxWidth: '90%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#DE1785',
                      color: '#fff',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      wordWrap: 'break-word'
                    }}
                  >
                    {message.content}
                  </div>
                ) : (
                  <div
                    style={{
                      maxWidth: '90%',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: '#c4c9cf',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      wordWrap: 'break-word'
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
                )}
              </div>
            );
          })}
            
          {isTyping && (
            <div style={{
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <div style={{
                padding: '8px 12px',
                borderRadius: '12px',
                background: '#f3f4f6',
                color: '#6b7280',
                fontSize: '12px'
              }}>
                Searching your email history...
              </div>
            </div>
          )}
            
            <div ref={messagesEndRef} />
          </div>

        {/* Input Area */}
        <div className="commandbchat-input">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isOrganizing ? "AI is organizing..." : "Ask about your emails, customers, patterns..."}
              disabled={isOrganizing}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                outline: 'none',
                background: isOrganizing ? '#f9fafb' : '#FFFBFA',
                boxSizing: 'border-box',
                color: isOrganizing ? '#9ca3af' : '#111827',
                cursor: isOrganizing ? 'not-allowed' : 'text'
              }}
              onFocus={(e) => {
                if (!isOrganizing) {
                  e.target.style.borderColor = '#DE1785';
                  e.target.style.boxShadow = '0 0 0 1px #DE1785';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSendMessage} // UPDATED: Now calls real API
              disabled={!inputValue.trim() || isOrganizing}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: (inputValue.trim() && !isOrganizing) ? '#DE1785' : '#e5e7eb',
                color: (inputValue.trim() && !isOrganizing) ? '#fff' : '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                cursor: (inputValue.trim() && !isOrganizing) ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'background 0.2s ease'
              }}
            >
              {isOrganizing ? 'Organizing...' : 'Send'}
            </button>
          </div>
          
          <p style={{
            margin: '6px 0 0 0',
            fontSize: '10px',
            color: '#9ca3af',
            textAlign: 'center'
          }}>
            Enter to send • Cmd+B to toggle
          </p>
        </div>

        {/* Tonality Analysis Modal */}
        {showTonalityModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: `${Math.min(400, width - 40)}px`,
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '24px' }}>🤖</span>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827'
                  }}>
                    B has something to say about this message
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    <span style={{
                      background: '#fbbf24',
                      color: '#92400e',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Alert: Medium
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#9a3412',
                  lineHeight: '1.4'
                }}>
                  This message appears much more casual than your previous correspondence. Consider adjusting the tone to maintain professional consistency.
                </p>
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowTonalityModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowTonalityModal(false);
                    handleSendMessage(); // Proceed with sending the message
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#DE1785',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Send Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CommandBChat; 