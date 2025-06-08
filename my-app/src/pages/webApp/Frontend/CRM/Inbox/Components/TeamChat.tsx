import React, { useState, useRef, useEffect } from 'react';

interface TeamMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  type: 'internal';
}

interface Props {
  threadId: string | null;
  messages: TeamMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  isVisible: boolean;
  onToggle: () => void;
}

const TeamChat: React.FC<Props> = ({
  threadId,
  messages,
  currentUserId,
  onSendMessage,
  isVisible,
  onToggle
}) => {
  // State
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isVisible && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !threadId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
      
      // Focus back to input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to send team message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: '20px',
      width: '350px',
      background: '#fff',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb',
      borderBottom: 'none',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      height: isVisible ? '400px' : '50px',
      transition: 'height 0.3s ease'
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          borderBottom: isVisible ? '1px solid #e5e7eb' : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f9fafb',
          borderRadius: isVisible ? '12px 12px 0 0' : '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🏢</span>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#111827'
          }}>
            Team Discussion
          </h3>
          
          {/* Unread indicator */}
          {Array.isArray(messages) && messages.length > 0 && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#de1785'
            }} />
          )}
        </div>

        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          transform: isVisible ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>
          ▼
        </div>
      </div>

      {/* Content */}
      {isVisible && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {!threadId ? (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                padding: '20px'
              }}>
                Select a conversation to start team discussion
              </div>
            ) : !Array.isArray(messages) || messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                padding: '20px'
              }}>
                No team messages yet.<br />
                Start a discussion about this conversation.
              </div>
            ) : (
              Array.isArray(messages) && messages.map((message) => {
                const isFromCurrentUser = message.sender === currentUserId;
                
                return (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      flexDirection: isFromCurrentUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isFromCurrentUser ? '#de1785' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {getInitials(message.sender)}
                    </div>

                    {/* Message */}
                    <div style={{
                      maxWidth: '75%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      {/* Sender & Time */}
                      <div style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        textAlign: isFromCurrentUser ? 'right' : 'left'
                      }}>
                        {message.sender} • {formatTimestamp(message.timestamp)}
                      </div>

                      {/* Content */}
                      <div style={{
                        background: isFromCurrentUser ? '#de1785' : '#f3f4f6',
                        color: isFromCurrentUser ? '#fff' : '#111827',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {threadId && (
            <form onSubmit={handleSubmit} style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end'
              }}>
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a team message..."
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '20px',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'none',
                    minHeight: '36px',
                    maxHeight: '80px',
                    fontFamily: 'inherit'
                  }}
                  rows={1}
                />
                
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSubmitting}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: newMessage.trim() && !isSubmitting ? '#de1785' : '#d1d5db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: newMessage.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0
                  }}
                >
                  {isSubmitting ? (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  ) : (
                    '↑'
                  )}
                </button>
              </div>
              
              <div style={{
                fontSize: '10px',
                color: '#6b7280',
                marginTop: '4px',
                textAlign: 'center'
              }}>
                Press Enter to send, Shift+Enter for new line
              </div>
            </form>
          )}
        </>
      )}

      {/* CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default TeamChat; 