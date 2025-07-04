import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../../AuthContext';
import LoadingScreen from '../../../components/LoadingScreen';
import { 
  discussionsService, 
  Discussion as ApiDiscussion, 
  DiscussionMessage as ApiDiscussionMessage,
  CreateDiscussionPayload,
  CreateMessagePayload 
} from '../../../../services/discussionsService';

interface Discussion extends ApiDiscussion {
  createdByName: string;
  lastMessage?: string;
  participantNames: string[];
}

interface DiscussionMessage extends ApiDiscussionMessage {
  // Frontend uses same structure as API
}

interface Props {
  onBackToInbox: () => void;
}

const DiscussionsContainer: React.FC<Props> = ({ onBackToInbox }) => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [discussionMessages, setDiscussionMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create modal state
  const [createTitle, setCreateTitle] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [createParticipants, setCreateParticipants] = useState('');

  // Helper function to get participant names (in real app, you'd fetch from user service)
  const getParticipantNames = (participantIds: string[]): string[] => {
    return participantIds.map(id => {
      if (id === user?.userId) return user?.displayName || 'You';
      // For now, return a placeholder name. In production, you'd fetch from user service
      return `User ${id.slice(-4)}`;
    });
  };

  // Helper function to convert API discussion to frontend format
  const transformDiscussion = (apiDiscussion: ApiDiscussion): Discussion => {
    return {
      ...apiDiscussion,
      createdByName: apiDiscussion.createdBy === user?.userId ? (user?.displayName || 'You') : `User ${apiDiscussion.createdBy.slice(-4)}`,
      participantNames: getParticipantNames(apiDiscussion.participants),
      lastMessage: undefined // We'll populate this when we get messages
    };
  };

  const selectedDiscussion = useMemo(() => {
    return discussions.find(d => d.discussionId === selectedDiscussionId);
  }, [discussions, selectedDiscussionId]);

  useEffect(() => {
    loadDiscussions();
  }, []);

  useEffect(() => {
    if (selectedDiscussionId) {
      loadDiscussionMessages(selectedDiscussionId);
    } else {
      setDiscussionMessages([]);
    }
  }, [selectedDiscussionId]);

  const loadDiscussions = async () => {
    if (!user?.userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const apiDiscussions = await discussionsService.listDiscussions(user.userId);
      const transformedDiscussions = apiDiscussions.map(transformDiscussion);
      setDiscussions(transformedDiscussions);
      
    } catch (err) {
      console.error('Error loading discussions:', err);
      setError('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscussionMessages = async (discussionId: string) => {
    if (!user?.userId) return;
    
    try {
      const messages = await discussionsService.getMessages(discussionId, user.userId);
      setDiscussionMessages(messages);
      
    } catch (err) {
      console.error('Error loading discussion messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDiscussionId || !user?.userId) return;

    try {
      const messagePayload: CreateMessagePayload = {
        discussionId: selectedDiscussionId,
        content: newMessage.trim()
      };

      const newMsg = await discussionsService.createMessage(user.userId, messagePayload);
      setDiscussionMessages(prev => [...prev, newMsg]);
      setNewMessage('');

      // Update the discussion's last message and message count
      setDiscussions(prev => prev.map(d => 
        d.discussionId === selectedDiscussionId 
          ? { 
              ...d, 
              lastMessage: newMessage.trim(), 
              lastMessageAt: newMsg.createdAt, 
              messageCount: d.messageCount + 1 
            }
          : d
      ));
      
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateTags('');
    setCreateParticipants('');
  };

  const handleCreateDiscussion = async () => {
    if (!user?.userId || !createTitle.trim()) return;

    try {
      const participants = createParticipants.split(',').map(p => p.trim()).filter(p => p);
      const tags = createTags.split(',').map(t => t.trim()).filter(t => t);
      
      const payload: CreateDiscussionPayload = {
        title: createTitle.trim(),
        participants,
        tags
      };

      const newDiscussion = await discussionsService.createDiscussion(user.userId, payload);
      const transformedDiscussion = transformDiscussion(newDiscussion);
      
      setDiscussions(prev => [transformedDiscussion, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
      setSelectedDiscussionId(newDiscussion.discussionId);
      
    } catch (err) {
      console.error('Error creating discussion:', err);
    }
  };

  const formatTime = (timestamp: number | string): string => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Loading discussions..." 
        submessage="Getting your team conversations ready"
      />
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{
          background: '#fff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>Error loading discussions</h3>
          <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>{error}</p>
          <button
            onClick={loadDiscussions}
            style={{
              padding: '8px 16px',
              background: '#de1785',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#f9fafb',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBackToInbox}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Back to Inbox
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827'
            }}>
              💬 Team Discussions
            </h2>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#DE1785',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          + New Discussion
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Discussions List */}
        <div style={{
          width: '400px',
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827'
            }}>
              Recent Discussions
            </h3>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: 'auto'
          }}>
            {discussions.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No discussions yet. Create your first team discussion!
              </div>
            ) : (
              discussions.map(discussion => (
                <div
                  key={discussion.discussionId}
                  onClick={() => setSelectedDiscussionId(discussion.discussionId)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: selectedDiscussionId === discussion.discussionId ? '#f8f9fa' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDiscussionId !== discussion.discussionId) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDiscussionId !== discussion.discussionId) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      flex: 1
                    }}>
                      {discussion.title}
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {formatTime(discussion.lastMessageAt || discussion.createdAt)}
                    </span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {discussion.participantNames.length} participants
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      •
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {discussion.messageCount} messages
                    </span>
                  </div>
                  
                  {discussion.lastMessage && (
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {discussion.lastMessage}
                    </p>
                  )}
                  
                  {discussion.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      marginTop: '8px'
                    }}>
                      {discussion.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            background: '#f3f4f6',
                            color: '#374151',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Discussion Messages */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!selectedDiscussion ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <h3 style={{ color: '#111827', marginBottom: '8px' }}>Select a discussion</h3>
                <p style={{ color: '#6b7280' }}>Choose a discussion from the sidebar to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Discussion Header */}
              <div style={{
                background: '#fff',
                borderBottom: '1px solid #e5e7eb',
                padding: '16px 24px'
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {selectedDiscussion.title}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <span>Created by {selectedDiscussion.createdByName}</span>
                  <span>•</span>
                  <span>{selectedDiscussion.participantNames.join(', ')}</span>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px',
                background: '#f9fafb'
              }}>
                {discussionMessages.map(message => (
                  <div
                    key={message.messageId}
                    style={{
                      marginBottom: '16px',
                      display: 'flex',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: message.authorId === user?.userId ? '#DE1785' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {message.authorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827'
                        }}>
                          {message.authorName}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      
                      <div style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#111827',
                        lineHeight: '1.5'
                      }}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div style={{
                background: '#fff',
                borderTop: '1px solid #e5e7eb',
                padding: '16px 24px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-end'
                }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'none',
                      minHeight: '44px',
                      maxHeight: '120px',
                      outline: 'none'
                    }}
                    rows={1}
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    style={{
                      background: newMessage.trim() ? '#DE1785' : '#e5e7eb',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'background 0.2s'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Discussion Modal */}
      {showCreateModal && (
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
          zIndex: 2000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Create New Discussion
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Discussion Title *
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Enter discussion title..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Participants (comma-separated user IDs)
              </label>
              <input
                type="text"
                value={createParticipants}
                onChange={(e) => setCreateParticipants(e.target.value)}
                placeholder="user123, user456..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
                placeholder="strategy, planning, urgent..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                style={{
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDiscussion}
                disabled={!createTitle.trim()}
                style={{
                  background: createTitle.trim() ? '#DE1785' : '#e5e7eb',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: createTitle.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Discussion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscussionsContainer; 