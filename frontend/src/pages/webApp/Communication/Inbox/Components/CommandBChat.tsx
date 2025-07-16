import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from "../../../../AuthContext";
import { API_ENDPOINTS } from '../../../../../config/api';

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
}

// New component for rendering styled message content
const MessageContent: React.FC<{ content: string; isPartial?: boolean }> = ({ content, isPartial = false }) => {
  // Parse and style the content
  const parseContent = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      if (line.trim() === '') {
        parts.push(<br key={`br-${lineIndex}`} />);
        return;
      }
      
      // Handle bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        const bulletContent = line.replace(/^[\s•-]+/, '');
        parts.push(
          <div key={`bullet-${lineIndex}`} style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '8px',
            paddingLeft: '8px'
          }}>
            <span style={{
              color: '#DE1785',
              fontWeight: 'bold',
              marginRight: '8px',
              lineHeight: '1.4',
              fontSize: '14px'
            }}>•</span>
            <span style={{ flex: 1, lineHeight: '1.4' }}>
              {parseInlineContent(bulletContent)}
            </span>
          </div>
        );
        return;
      }
      
      // Handle regular lines
      parts.push(
        <div key={`line-${lineIndex}`} style={{ marginBottom: lineIndex < lines.length - 1 ? '8px' : '0' }}>
          {parseInlineContent(line)}
        </div>
      );
    });
    
    return parts;
  };
  
  // Parse inline content (bold, emails, etc.)
  const parseInlineContent = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    
    // Pattern for **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        const beforeText = text.slice(currentIndex, match.index);
        parts.push(...parseEmailsAndOther(beforeText, parts.length));
      }
      
      // Add bold text
      parts.push(
        <strong key={`bold-${parts.length}`} style={{
          fontWeight: '600',
          color: '#111827'
        }}>
          {match[1]}
        </strong>
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      parts.push(...parseEmailsAndOther(remainingText, parts.length));
    }
    
    return parts;
  };
  
  // Parse emails and other patterns
  const parseEmailsAndOther = (text: string, startIndex: number): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let workingText = text;
    let partIndex = 0;
    
    // Pattern for emails in angle brackets
    const emailRegex = /<([^>]+@[^>]+)>/g;
    let emailMatch;
    let lastIndex = 0;
    
    while ((emailMatch = emailRegex.exec(workingText)) !== null) {
      // Add text before the match
      if (emailMatch.index > lastIndex) {
        const beforeText = workingText.slice(lastIndex, emailMatch.index);
        parts.push(...parseTimeAndCounts(beforeText, startIndex + partIndex));
        partIndex += parseTimeAndCounts(beforeText, startIndex + partIndex).length;
      }
      
      // Add styled email
      parts.push(
        <span key={`email-${startIndex}-${partIndex++}`} style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          background: '#f3f4f6',
          padding: '1px 4px',
          borderRadius: '3px',
          color: '#6b7280'
        }}>
          {emailMatch[1]}
        </span>
      );
      
      lastIndex = emailMatch.index + emailMatch[0].length;
    }
    
    // Add remaining text
    if (lastIndex < workingText.length) {
      const remainingText = workingText.slice(lastIndex);
      parts.push(...parseTimeAndCounts(remainingText, startIndex + partIndex));
    }
    
    return parts;
  };
  
  // Parse time indicators and counts
  const parseTimeAndCounts = (text: string, startIndex: number): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let workingText = text;
    
    // Pattern for time indicators like "1d ago", "15h ago", "2 weeks ago"
    const timeRegex = /(\b\d+[dwmh]\s+ago\b|\b\d+\s+(day|days|hour|hours|week|weeks|month|months)\s+ago\b)/g;
    let timeMatch;
    let lastIndex = 0;
    
    while ((timeMatch = timeRegex.exec(workingText)) !== null) {
      // Add text before the match
      if (timeMatch.index > lastIndex) {
        const beforeText = workingText.slice(lastIndex, timeMatch.index);
        parts.push(...parseQuotedText(beforeText, startIndex + parts.length));
      }
      
      // Add styled time indicator
      parts.push(
        <span key={`time-${startIndex}-${parts.length}`} style={{
          fontSize: '11px',
          color: '#6b7280',
          background: '#f9fafb',
          padding: '1px 4px',
          borderRadius: '3px',
          fontWeight: '500'
        }}>
          {timeMatch[1]}
        </span>
      );
      
      lastIndex = timeMatch.index + timeMatch[0].length;
    }
    
    // Add remaining text
    if (lastIndex < workingText.length) {
      const remainingText = workingText.slice(lastIndex);
      parts.push(...parseQuotedText(remainingText, startIndex + parts.length));
    }
    
    return parts;
  };
  
  // Parse quoted text (email subjects, etc.)
  const parseQuotedText = (text: string, startIndex: number): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let workingText = text;
    
    // Pattern for quoted text like "Subject line"
    const quoteRegex = /"([^"]+)"/g;
    let quoteMatch;
    let lastIndex = 0;
    
    while ((quoteMatch = quoteRegex.exec(workingText)) !== null) {
      // Add text before the match
      if (quoteMatch.index > lastIndex) {
        const beforeText = workingText.slice(lastIndex, quoteMatch.index);
        parts.push(...parseNumbers(beforeText, startIndex + parts.length));
      }
      
      // Add styled quoted text
      parts.push(
        <span key={`quote-${startIndex}-${parts.length}`} style={{
          fontStyle: 'italic',
          color: '#4f46e5',
          fontWeight: '500'
        }}>
          "{quoteMatch[1]}"
        </span>
      );
      
      lastIndex = quoteMatch.index + quoteMatch[0].length;
    }
    
    // Add remaining text
    if (lastIndex < workingText.length) {
      const remainingText = workingText.slice(lastIndex);
      parts.push(...parseNumbers(remainingText, startIndex + parts.length));
    }
    
    return parts;
  };
  
  // Parse important numbers and counts
  const parseNumbers = (text: string, startIndex: number): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    
    // Pattern for important counts like "Found 8 important emails" or "22 total emails"
    const numberRegex = /(\b(?:Found\s+)?(\d+)\s+(?:important\s+)?(?:emails?|messages?|total\s+emails?)\b)/g;
    let numberMatch;
    let lastIndex = 0;
    
    while ((numberMatch = numberRegex.exec(text)) !== null) {
      // Add text before the match
      if (numberMatch.index > lastIndex) {
        parts.push(text.slice(lastIndex, numberMatch.index));
      }
      
      // Add styled number/count
      parts.push(
        <span key={`number-${startIndex}-${parts.length}`} style={{
          fontWeight: '600',
          color: '#DC2626',
          background: '#FEF2F2',
          padding: '1px 4px',
          borderRadius: '3px',
          fontSize: '12px'
        }}>
          {numberMatch[1]}
        </span>
      );
      
      lastIndex = numberMatch.index + numberMatch[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts;
  };
  
  return (
    <div style={{
      lineHeight: '1.5',
      color: '#374151'
    }}>
      {parseContent(content)}
      {isPartial && (
        <span style={{
          opacity: 0.7,
          animation: 'blink 1s infinite',
          marginLeft: '2px'
        }}>|</span>
      )}
    </div>
  );
};

const CommandBChat: React.FC<CommandBChatProps> = ({ onClose, initialMessage, width = 280 }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typewriterStates, setTypewriterStates] = useState<{[key: string]: string}>({});
  
  // Mock tonality analysis feature
  const [showTonalityModal, setShowTonalityModal] = useState(false);
  
  // Short-term memory configuration
  const MAX_CONVERSATION_HISTORY = 10; // Keep last 10 messages for context
  
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API Base URL - matches your backend server
  const API_BASE = API_ENDPOINTS.BACKEND_URL;

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

  // Initialize chat with welcome message when component first mounts
  useEffect(() => {
    const initializeChat = () => {
      if (initialMessage) {
        // If there's an initial message, show it directly with typewriter effect
        const newMessage: Message = {
          id: 'initial-message',
          content: '',
          sender: 'assistant',
          timestamp: new Date()
        };

        setMessages([newMessage]);
        
        // Start typewriter effect immediately
        setTimeout(() => {
          startTypewriter('initial-message', initialMessage);
        }, 100);
      } else {
        // Show simple welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          content: '',
          sender: 'assistant',
          timestamp: new Date()
        };

        setMessages([welcomeMessage]);
        
        // Start typewriter effect for welcome message
        setTimeout(() => {
          startTypewriter('welcome', 'Welcome back! I can now search through your email history and provide contextual insights. Try asking me about customer patterns, recent conversations, or business trends.');
        }, 100);
              }
      };

      initializeChat();
      
      // Auto-focus input after a short delay to prevent scroll
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }, [initialMessage]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  // NEW: Real API integration with semantic search
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
      // Call your semantic search API with conversation history for context
      const conversationHistory = getConversationHistory();
      const response = await fetch(API_ENDPOINTS.QUERY_AI, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: currentQuery,
          userId: user?.userId || null,
          topK: 5,
          conversationHistory: conversationHistory
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

    } catch (error) {
      console.error('❌ API call failed:', error);
      
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
        let errorText = 'Sorry, I\'m having trouble connecting to the AI service right now. ';
        
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            errorText += 'This might be a connection issue. Please check your internet connection and try again.';
          } else if (error.message.includes('CORS')) {
            errorText += 'There appears to be a configuration issue with the server. Please contact support.';
          } else if (error.message.includes('404')) {
            errorText += 'The AI service endpoint was not found. Please ensure the backend is properly configured.';
          } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            errorText += 'The server is experiencing issues. Please try again in a moment.';
          } else {
            errorText += `Error details: ${error.message}`;
          }
        } else {
          errorText += 'An unexpected error occurred. Please try again.';
        }
        
        console.error('Full error details:', {
          error,
          endpoint: API_ENDPOINTS.QUERY_AI,
          isDevelopment: process.env.NODE_ENV === 'development'
        });
        
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
          from {
            opacity: 0;
          }
          to {
            opacity: 0.6;
          }
        }
        
        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
      `}</style>
      <div style={{
        width: `${width}px`,
        height: '100%',
        background: '#FFFBFA',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0
      }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827'
            }}>
              Chat with B
            </h3>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Context-aware AI assistant
            </p>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '10px',
              color: '#9ca3af'
            }}>
              Memory: {getConversationHistory().length}/{MAX_CONVERSATION_HISTORY} messages
            </p>
          </div>
        </div>
          
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            color: '#6b7280',
            fontSize: '14px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Back to Integrations (Cmd+B)"
        >
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px',
        background: '#FFFBFA',
        minHeight: 0,
        scrollBehavior: 'smooth'
      }}>
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
                    background: '#FDF2F8',
                    border: '1px solid #DE1785',
                    color: '#DE1785',
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
                    fontSize: '12px',
                    wordWrap: 'break-word'
                  }}
                >
                  <MessageContent 
                    content={displayContent}
                    isPartial={isTypewriter && displayContent.length < message.content.length}
                  />
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
      <div style={{
        padding: '12px 12px 8px 12px',
        flexShrink: 0
      }}>
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
            placeholder="Ask about your emails, customers, patterns..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
              outline: 'none',
              background: '#FFFBFA',
              boxSizing: 'border-box',
              color: '#111827',
              cursor: 'text'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#DE1785';
              e.target.style.boxShadow = '0 0 0 1px #DE1785';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSendMessage} // UPDATED: Now calls real API
            disabled={!inputValue.trim()}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: inputValue.trim() ? '#DE1785' : '#e5e7eb',
              color: inputValue.trim() ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'background 0.2s ease'
            }}
          >
            Send
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