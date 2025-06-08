import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../../AuthContext';
import { EditorState, convertToRaw, Editor } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import EmailReplyEditor from '../SendBox';
import './MessageView.css';

interface APIMessage {
  MessageId?: string;
  Body?: string;
  Text?: string;
  Subject?: string;
  From?: string;
  To?: string;
  Direction: 'incoming' | 'outgoing';
  Timestamp: number;
  Channel?: 'whatsapp' | 'email';
  ThreadId?: string;
  MediaUrl?: string;
  MediaType?: string;
}

interface MessageViewProps {
  messages: APIMessage[];
  selectedThreadId: string | null;
  isLoading: boolean;
  onReply?: () => void;
  onShare?: (threadId: string) => void;
  onSendMessage: (messageData: any) => Promise<void>;
  flow?: any;
  statusFilter?: Status | 'all';
  onStatusFilterChange?: (status: Status | 'all') => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  onFlowUpdate?: (updatedFlow: any) => void;
}

interface Message {
  MessageId?: string;
  id?: string;
  Body?: string;
  body?: string;
  Direction: 'incoming' | 'outgoing';
  direction?: 'incoming' | 'outgoing';
  Timestamp: number;
  timestamp?: string;
  Channel?: 'whatsapp' | 'email';
  channel?: 'whatsapp' | 'email';
  ThreadId?: string;
  threadId?: string;
  senderName?: string;
  subject?: string;
}

interface TeamMessage {
  flowId: string;
  commentId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

type Channel = 'whatsapp' | 'email';
type Status = 'open' | 'waiting' | 'resolved' | 'overdue';

const API_BASE = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod';

const MessageView: React.FC<MessageViewProps> = ({ 
  messages, 
  selectedThreadId, 
  isLoading, 
  onReply, 
  onShare, 
  onSendMessage, 
  flow,
  statusFilter: externalStatusFilter = 'all',
  onStatusFilterChange,
  categoryFilter: externalCategoryFilter = 'all',
  onCategoryFilterChange,
  onFlowUpdate
}) => {
  const { user } = useAuth();
  
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [teamChatInput, setTeamChatInput] = useState('');
  const [emailEditorState, setEmailEditorState] = useState<EditorState>(
    () => EditorState.createEmpty()
  );

  // Header controls state - use external filters if provided
  const statusFilter = externalStatusFilter;
  const categoryFilter = externalCategoryFilter;

  const emailEditorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (selectedThreadId) {
      loadTeamMessages(selectedThreadId);
    } else {
      setTeamMessages([]);
    }
  }, [selectedThreadId]);



  const loadTeamMessages = async (threadId: string) => {
    try {
      console.log('Loading team messages for thread:', threadId);
      const response = await fetch(`https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${encodeURIComponent(threadId)}/comments`);
      if (!response.ok) throw new Error('Failed to load team messages');
      
      const data = await response.json();
      console.log('Team messages response:', data);
      // The API returns { comments: Array } so extract the comments array
      const messagesArray = Array.isArray(data.comments) ? data.comments : [];
      console.log('Setting team messages:', messagesArray);
      setTeamMessages(messagesArray);
    } catch (err) {
      console.error('Error loading team messages:', err);
      setTeamMessages([]); // Set empty array on error
    }
  };

  function getChannel(id: string): Channel {
    const flow = messages.find(m => m.ThreadId === id);
    return flow?.Channel || 'email';
  }

  function linkifyWithImages(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    return text.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(part);
        
        if (isImage) {
          return (
            <div key={index} style={{ margin: '8px 0' }}>
              <img
                src={part}
                alt="Shared image"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const link = document.createElement('a');
                  link.href = part;
                  link.textContent = part;
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  link.style.color = '#DE1785';
                  link.style.textDecoration = 'underline';
                  target.parentNode?.appendChild(link);
                }}
              />
            </div>
          );
        } else {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#DE1785', textDecoration: 'underline' }}
            >
              {part}
            </a>
          );
        }
      }
      return part;
    });
  }

  const handleReplySend = async () => {
    if (!selectedThreadId) return;

    try {
      const channel = getChannel(selectedThreadId);
      
      if (channel === 'email') {
        const rawContentState = convertToRaw(emailEditorState.getCurrentContent());
        const htmlContent = draftToHtml(rawContentState);
        const plainText = emailEditorState.getCurrentContent().getPlainText();
        
        await onSendMessage({
          channel: 'email',
          to: flow?.contactEmail || '',
          subject: replySubject,
          content: plainText,
          html: htmlContent
        });
        
        setEmailEditorState(EditorState.createEmpty());
        setReplySubject('');
      } else {
        await onSendMessage({
          channel: 'whatsapp',
          to: flow?.contactPhone || '',
          content: replyText
        });
        
        setReplyText('');
      }
      
      setIsReplying(false);
    } catch (err) {
      console.error('Error sending reply:', err);
    }
  };

  const handleTeamChatSend = async () => {
    if (!teamChatInput.trim() || !selectedThreadId) return;

    const safeId = encodeURIComponent(selectedThreadId);

    try {
      const payload = {
        authorId: user!.userId,
        authorName: user!.displayName || user!.email || 'You',
        text: teamChatInput.trim(),
      };

      console.log('Sending team message:', payload);
      const res = await fetch(`https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${safeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        throw new Error(errorText);
      }

      const newComment = await res.json();
      console.log('New comment response:', newComment);

      setTeamChatInput('');
      console.log('About to reload team messages...');
      await loadTeamMessages(selectedThreadId);
    } catch (err) {
      console.error('Error sending team message:', err);
    }
  };

  const addParticipant = async (flowId: string, newEmail: string) => {
    try {
      const payload = { newEmail };
      const res = await fetch(`${API_BASE}/flows/${encodeURIComponent(flowId)}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      console.log('Participant added successfully');
    } catch (err) {
      console.error('Error adding participant:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };



  // Helper function to safely format timestamps
  const formatTimestamp = (timestamp: number | string | undefined): string => {
    if (!timestamp) return new Date().toISOString();
    
    const num = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    if (isNaN(num)) return new Date().toISOString();
    
    // If timestamp is likely in seconds (less than year 2100 in milliseconds)
    // Convert to milliseconds, otherwise assume it's already in milliseconds
    const msTimestamp = num < 4102444800000 ? num * 1000 : num;
    
    return new Date(msTimestamp).toISOString();
  };

  // Helper function to safely display dates
  const formatDisplayDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const normalizeMessage = (msg: APIMessage) => ({
    id: msg.MessageId || `${msg.Timestamp || Date.now()}`,
    body: msg.Body || msg.Text || '',
    direction: msg.Direction || 'incoming',
    timestamp: formatTimestamp(msg.Timestamp),
    channel: msg.Channel || 'email',
    threadId: msg.ThreadId || '',
    senderName: msg.Direction === 'incoming' ? 'Customer' : 'You',
    subject: msg.Subject || ''
  });

  const normalizedMessages = messages.map(normalizeMessage);

  if (isLoading) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: 'calc(100vh - 65px)',
        overflow: 'hidden'
      }}>
        <div>Loading messages...</div>
      </div>
    );
  }

  if (!selectedThreadId) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: 'calc(100vh - 65px)',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the sidebar to view messages</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: 'calc(100vh - 65px)',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📬</div>
          <h3>No messages yet</h3>
          <p>This conversation hasn't started yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: selectedThreadId ? 'calc(100% - 60px)' : '100%', // Adjust height when margin is applied
      marginTop: selectedThreadId ? '60px' : '0' // Add top margin when status bar is visible
    }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {!selectedThreadId ? (
          <p style={{ textAlign: 'center', color: '#666', fontSize: '16px', marginTop: '100px' }}>
            Select a conversation to view messages.
          </p>
        ) : normalizedMessages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', fontSize: '16px', marginTop: '100px' }}>
            No messages in this conversation yet.
          </p>
        ) : (
                     <div style={{ 
             width: '100%', 
             maxWidth: '100%',
             margin: '0 auto',
             overflowX: 'hidden',
             boxSizing: 'border-box'
           }}>
            {normalizedMessages.map(chat => {
              const isActive = chat.id === activeMessageId;

              return (
                                 <div
                   key={`${chat.id}-${chat.timestamp}`}
                   onClick={() => {
                     setActiveMessageId(chat.id);
                   }}
                   style={{
                     boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                     width: '100%',
                     maxWidth: '100%',
                     margin: '0 auto 16px auto',
                     padding: 12,
                     borderRadius: 8,
                     background: '#FFFBFA',
                     overflow: 'hidden',
                     cursor: 'pointer',
                     border: '1px solid #f0f0f0',
                     wordWrap: 'break-word',
                     overflowWrap: 'break-word',
                     
                     maxHeight: isActive ? 'none' : '80px',
                     transition: 'max-height 0.3s ease-out, box-shadow 0.2s ease',
                   }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.9em' }}>
                      <strong style={{ color: chat.direction === 'incoming' ? '#DE1785' : '#2563eb' }}>
                        {chat.senderName}
                      </strong> ·{' '}
                      <span style={{ color: '#888' }}>
                        {formatDisplayDate(chat.timestamp)}
                      </span>
                    </p>
                    <div style={{
                      fontSize: '12px',
                      background: chat.direction === 'incoming' ? '#f3f4f6' : '#e0f2fe',
                      color: chat.direction === 'incoming' ? '#374151' : '#0369a1',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold'
                    }}>
                      {chat.direction}
                    </div>
                  </div>
                  
                  {chat.subject && (
                    <p style={{ 
                      fontStyle: 'italic', 
                      margin: '4px 0', 
                      fontSize: '0.95em',
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      Subject: {chat.subject}
                    </p>
                  )}
                  
                                     <div style={{
                     margin: '8px 0 0',
                     whiteSpace: 'pre-wrap',
                     lineHeight: '1.5',
                     overflow: isActive ? 'visible' : 'hidden',
                     fontSize: '14px',
                     wordWrap: 'break-word',
                     wordBreak: 'break-word',
                     overflowWrap: 'break-word',
                     maxWidth: '100%'
                   }}>
                     {linkifyWithImages(chat.body)}
                   </div>
                  
                  {isActive && selectedThreadId && (
                    <div style={{ 
                      textAlign: 'left', 
                      marginTop: 20, 
                      borderTop: '1px solid #e5e7eb',
                      paddingTop: '12px',
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const email = prompt('Enter email to add:');
                          if (email) addParticipant(selectedThreadId, email);
                        }}
                        style={{
                          background: '#6366f1',
                          color: '#fff',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#4f46e5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#6366f1';
                        }}
                      >
                        Share
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsReplying(!isReplying);
                        }}
                        style={{
                          background: '#DE1785',
                          color: '#fff',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#c1166a';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#DE1785';
                        }}
                      >
                        Reply to Customer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ 
        padding: 16, 
        backgroundColor: '#FBF7F7',
        borderTop: '1px solid #e5e7eb',
        minHeight: '250px'
      }}>
        {/* Team Discussion Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
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
          {Array.isArray(teamMessages) && teamMessages.length > 0 && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#de1785'
            }} />
          )}
        </div>

        <div style={{
          height: 150,
          overflowY: 'auto',
          marginBottom: 16,
          padding: '12px',
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {!selectedThreadId ? (
            <div style={{
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px',
              padding: '20px'
            }}>
              Select a conversation to start team discussion
            </div>
          ) : !Array.isArray(teamMessages) || teamMessages.length === 0 ? (
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
            Array.isArray(teamMessages) && teamMessages.map((msg) => {
              const isFromCurrentUser = false; // We don't have current user ID, so showing all as others for now
              
              return (
                <div
                  key={msg.commentId}
                  style={{
                    display: 'flex',
                    flexDirection: isFromCurrentUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '12px'
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
                    {msg.authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
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
                      {msg.authorName} • {formatDisplayDate(msg.createdAt)}
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
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Input Area */}
        {selectedThreadId && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end'
          }}>
            <textarea
              value={teamChatInput}
              onChange={e => setTeamChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTeamChatSend();
                }
              }}
              placeholder="Type a team message..."
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
              onClick={handleTeamChatSend}
              disabled={!teamChatInput.trim()}
              style={{
                width: '36px',
                height: '36px',
                background: teamChatInput.trim() ? '#de1785' : '#d1d5db',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                cursor: teamChatInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
            >
              ↑
            </button>
          </div>
        )}
        
        {!selectedThreadId && (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
            padding: '20px'
          }}>
            Select a conversation to start team discussion
          </div>
        )}
      </div>

      {isReplying && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20 
            }}>
              <h3 style={{ margin: 0, color: '#374151' }}>Reply to Customer</h3>
              <button
                onClick={() => setIsReplying(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: 4
                }}
              >
                ×
              </button>
            </div>

            {selectedThreadId && getChannel(selectedThreadId) === 'email' && (
              <>
                <input
                  type="text"
                  value={replySubject}
                  onChange={e => setReplySubject(e.target.value)}
                  placeholder="Subject"
                  style={{
                    width: '100%',
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    boxSizing: 'border-box',
                    fontSize: '14px'
                  }}
                />
                <EmailReplyEditor
                  ref={emailEditorRef}
                  editorState={emailEditorState}
                  onChange={setEmailEditorState}
                  onSend={handleReplySend}
                />
              </>
            )}

            {selectedThreadId && getChannel(selectedThreadId) === 'whatsapp' && (
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your WhatsApp reply…"
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: 16,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  marginBottom: 16,
                  background: '#fff',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, sans-serif'
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsReplying(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReplySend}
                style={{
                  background: '#DE1785',
                  color: '#fff',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(222,23,133,0.3)',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#c1166a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#DE1785';
                }}
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageView; 