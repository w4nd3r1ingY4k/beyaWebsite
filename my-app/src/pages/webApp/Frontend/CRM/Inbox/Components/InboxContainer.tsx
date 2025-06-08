import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../../AuthContext';
import ThreadList from './ThreadList';
import MessageView from './MessageView';
import ComposeModal from './ComposeModal';
import TeamChat from './TeamChat';

interface Message {
  MessageId?: string;
  Body?: string;
  Direction: 'incoming' | 'outgoing';
  Timestamp: number;
  Channel?: 'whatsapp' | 'email';
  ThreadId?: string;
}

interface TeamMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  type: 'internal';
}

interface Props {}

const InboxContainer: React.FC<Props> = () => {
  const { user } = useAuth();
  // State management
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<string[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply'>('new');
  const [isTeamChatVisible, setIsTeamChatVisible] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'waiting' | 'resolved' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // API Base URL
  const apiBase = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod';

  // Current flow
  const currentFlow = useMemo(() => {
    return Array.isArray(flows) ? flows.find(f => f.flowId === selectedThreadId) : undefined;
  }, [flows, selectedThreadId]);

  // Load data on mount
  useEffect(() => {
    loadInboxData();
  }, [user]);

  // Load messages when thread changes
  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
      loadTeamMessages(selectedThreadId);
    } else {
      setMessages([]);
      setTeamMessages([]);
    }
  }, [selectedThreadId]);

  const loadInboxData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load flows
      const flowsResponse = await fetch(`${apiBase}/flows`);
      if (!flowsResponse.ok) throw new Error('Failed to load conversations');
      
      const flowsData = await flowsResponse.json();
      console.log('Loaded flows:', flowsData);
      
      const flowsArray = flowsData.flows || [];
      setFlows(flowsArray);
      setThreads(flowsArray.map((f: any) => f.flowId));
      
    } catch (err) {
      console.error('Error loading inbox data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      console.log('🔄 Loading messages for thread:', threadId);
      
      const response = await fetch(`${apiBase}/webhook/threads/${encodeURIComponent(threadId)}`);
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      console.log('📥 Raw API response:', data);
      
      const messagesArray = data.messages || [];
      console.log('📥 Processed messages array:', messagesArray);
      console.log('📥 Setting messages count:', messagesArray.length);
      
      setMessages(messagesArray);
      
      console.log('✅ Messages set for thread:', threadId);
    } catch (err) {
      console.error('❌ Error loading messages:', err);
      setMessages([]); // Clear messages on error
    }
  };

  const loadTeamMessages = async (threadId: string) => {
    try {
      // Use the team messages endpoint from original code
      const response = await fetch(`https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${encodeURIComponent(threadId)}/comments`);
      if (!response.ok) throw new Error('Failed to load team messages');
      
      const data = await response.json();
      // The API returns { comments: Array } so extract the comments array
      setTeamMessages(Array.isArray(data.comments) ? data.comments : []);
    } catch (err) {
      console.error('Error loading team messages:', err);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    console.log('🎯 Thread selected:', threadId);
    console.log('🎯 Previous thread was:', selectedThreadId);
    setSelectedThreadId(threadId);
  };

  // Copy the exact functions from MessageList
  async function sendWhatsAppMessage(to: string, body: string) {
    const payload = { to, text: body, userId: user!.userId };
    console.log('WhatsApp payload:', payload);
    console.log('User object:', user);
    
    const res = await fetch(`${apiBase}/send/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function sendEmailMessage(
    to: string,
    subject: string,
    plainText: string,
    htmlContent: string,
    originalMessageId?: string
  ) {
    const payload: any = {
      to,
      subject,
      text: plainText,
      html: htmlContent,
      userId: user!.userId
    };

    if (originalMessageId) {
      payload.originalMessageId = originalMessageId;
    }

    const res = await fetch(`${apiBase}/send/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json();
  }

  const handleComposeMessage = async (messageData: any) => {
    console.log('handleComposeMessage received:', messageData);
    try {
      // For replies, use replyToId as the recipient; for new messages, use the user-entered 'to'
      const recipient = messageData.replyToId || messageData.to;
      
      if (messageData.channel === 'whatsapp') {
        await sendWhatsAppMessage(recipient, messageData.content);
      } else {
        await sendEmailMessage(
          recipient,
          messageData.subject || 'No subject',
          messageData.content,
          messageData.content
        );
      }
      
      // Reload data
      await loadInboxData();
      if (selectedThreadId) {
        await loadMessages(selectedThreadId);
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const handleSendTeamMessage = async (content: string) => {
    if (!selectedThreadId) return;

    const safeId = encodeURIComponent(selectedThreadId);

    try {
      const response = await fetch(`https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${safeId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: user!.userId,
          authorName: user!.displayName || user!.email || 'You',
          text: content,
        }),
      });

      if (!response.ok) throw new Error('Failed to send team message');
      
      // Reload team messages
      await loadTeamMessages(selectedThreadId);
      
    } catch (err) {
      console.error('Error sending team message:', err);
      throw err;
    }
  };

  const handleReply = () => {
    setComposeMode('reply');
    setIsComposeOpen(true);
  };

  const handleShare = async (threadId: string) => {
    const email = prompt('Enter email to add:');
    if (!email || !user) return;

    try {
      // Add participant logic here (similar to original MessageList)
      console.log('Adding participant:', email, 'to thread:', threadId);
      // TODO: Implement the actual API call for adding participants
    } catch (err) {
      console.error('Error adding participant:', err);
    }
  };

  const handleNewMessage = () => {
    setComposeMode('new');
    setIsComposeOpen(true);
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedThreadId) return;

    try {
      const response = await fetch(`${apiBase}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowId: selectedThreadId,
          status
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      // Reload flows to update status
      await loadInboxData();
      
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // New function to handle status selection from dropdown (like in MessageList.tsx)
  const handleStatusSelect = async (status: 'open' | 'waiting' | 'resolved' | 'overdue') => {
    setShowStatusDropdown(false); // Close dropdown

    if (!selectedThreadId) return;
    const flowObj = flows.find(f => f.flowId === selectedThreadId);
    if (!flowObj) return;

    try {
      // Use the exact same updateFlow logic as MessageList.tsx
      const payload = { 
        status,
        userId: user!.userId // Add userId as in MessageList.tsx
      };
      
      const FUNCTION_URL = 'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws';
      const response = await fetch(`${FUNCTION_URL}/flows/${encodeURIComponent(selectedThreadId)}`, {
        method: 'PATCH', // Use PATCH method like MessageList.tsx
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      const updatedFlow = result.updated || result; // Handle both response formats
      
      // Update local state with the new flow data
      setFlows(prevFlows =>
        prevFlows.map(f => (f.flowId === updatedFlow.flowId ? updatedFlow : f))
      );
      
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(`Could not update status: ${err.message}`);
    }
  };

  // Handle flow updates from MessageView
  const handleFlowUpdate = (updatedFlow: any) => {
    console.log('Updating flow in parent state:', updatedFlow);
    
    // Update the flows array with the updated flow
    setFlows(prevFlows => 
      prevFlows.map(flow => 
        flow.flowId === updatedFlow.flowId ? updatedFlow : flow
      )
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 65px)', // Match the header space adjustment
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #de1785',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ color: '#6b7280' }}>Loading inbox...</div>
        </div>
        
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
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 65px)', // Match the header space adjustment
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
          <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>Error loading inbox</h3>
          <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>{error}</p>
          <button
            onClick={loadInboxData}
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
      height: 'calc(100vh - 65px)', // Match the header space adjustment
      background: '#f9fafb',
      width: '100%',
      position: 'relative'
    }}>
      {/* Status Filter Bar positioned absolutely to span ThreadList's right column + MessageView */}
      {selectedThreadId && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '180px', // Start after the left sidebar (180px width)
          right: 0, // Extend to the end
          padding: '16px 16px 0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          zIndex: 10,
          height: '60px', // Fixed height for the status bar
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            fontSize: '15px',
            gap: '12px',
            alignItems: 'center',
          }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                background: statusFilter === 'all' ? '#f3f4f6' : 'transparent',
                border: 'none',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '17px',
                color: '#374151',
                borderRadius: '4px',
              }}
            >
              All
            </button>
            {(['open', 'waiting', 'resolved', 'overdue'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '17px',
                  color: '#374151',
                  borderRadius: '4px',
                  position: 'relative',
                  outline: 'none',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
                {statusFilter === s && (
                  <span style={{
                    display: 'block',
                    position: 'absolute',
                    left: 6,
                    right: 6,
                    bottom: -4,
                    height: 6,
                    background: s === 'open' ? '#10b981' : s === 'waiting' ? '#f59e0b' : s === 'resolved' ? '#6b7280' : '#ef4444',
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    zIndex: 0,
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Right-side action buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Status dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                {currentFlow?.status?.charAt(0).toUpperCase() + currentFlow?.status?.slice(1) || 'Select Status'}
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M5 8l5 5 5-5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {showStatusDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    background: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
                    minWidth: '140px',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}
                >
                  {(['open', 'waiting', 'resolved', 'overdue'] as const).map(s => (
                    <div
                      key={s}
                      onClick={() => handleStatusSelect(s)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                        background: currentFlow?.status === s ? '#f3f4f6' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={e =>
                        (e.currentTarget.style.background = currentFlow?.status === s ? '#f3f4f6' : 'transparent')
                      }
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background:
                            s === 'open'
                              ? '#10b981' // Green
                              : s === 'waiting'
                              ? '#f59e0b' // Yellow
                              : s === 'resolved'
                              ? '#6b7280' // Gray
                              : '#ef4444', // Red
                        }}
                      />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 8l4 4 4-4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content area - no margin here, let ThreadList handle its own spacing */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Complete ThreadList component (includes left sidebar + thread list) */}
        <ThreadList
          threads={threads}
          flows={flows}
          selectedId={selectedThreadId}
          onSelect={handleThreadSelect}
          userId={user!.userId}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          onCompose={handleNewMessage}
        />

        {/* Message View */}
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <MessageView
            messages={messages}
            selectedThreadId={selectedThreadId}
            isLoading={loading}
            onSendMessage={handleComposeMessage}
            flow={currentFlow}
            onReply={handleReply}
            onShare={handleShare}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            onFlowUpdate={handleFlowUpdate}
          />
        </div>
      </div>



      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleComposeMessage}
        mode={composeMode}
        replyToId={selectedThreadId ?? undefined}
      />


    </div>
  );
};

export default InboxContainer; 