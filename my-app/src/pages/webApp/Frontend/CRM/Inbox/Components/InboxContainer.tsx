import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../../AuthContext';
import ThreadList from './ThreadList';
import MessageView from './MessageView';
import ComposeModal from './ComposeModal';
import TeamChat from './TeamChat';
import LoadingScreen from '../../../components/LoadingScreen';

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

interface Props {
  onOpenAIChat?: (message?: string) => void;
}

const InboxContainer: React.FC<Props> = ({ onOpenAIChat }) => {
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
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  


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
      
      // Validate recipient
      if (!recipient || !recipient.trim()) {
        throw new Error('Recipient email/phone number is required');
      }
      
      if (messageData.channel === 'whatsapp') {
        await sendWhatsAppMessage(recipient, messageData.content);
      } else {
        await sendEmailMessage(
          recipient,
          messageData.subject || 'No subject',
          messageData.content, // plain text
          messageData.html || messageData.content, // HTML content
          messageData.originalMessageId // Pass original Message-ID for threading
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

  const handleCategoryFilterChange = (categories: string[]) => {
    setCategoryFilter(categories);
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
    console.log('🔄 Flow Update Received:', updatedFlow);
    console.log('🔄 Updated flow ID:', updatedFlow.flowId);
    console.log('🔄 Current flows count:', flows.length);
    
    // Debug: log first few existing flow IDs
    console.log('🔄 Existing flow IDs:', flows.slice(0, 3).map(f => f.flowId));
    
    // Update the flows array with the updated flow
    setFlows(prevFlows => {
      console.log('🔄 Looking for flowId:', updatedFlow.flowId);
      console.log('🔄 Available flowIds:', prevFlows.map(f => f.flowId));
      
      const updated = prevFlows.map(flow => 
        flow.flowId === updatedFlow.flowId ? updatedFlow : flow
      );
      console.log('🔄 Updated flows count:', updated.length);
      console.log('🔄 Updated flow found:', updated.find(f => f.flowId === updatedFlow.flowId));
      return updated;
    });
  };

  // Handle opening AI chat with a specific message - delegate to global handler
  const handleOpenAIChatLocal = (message: string) => {
    if (onOpenAIChat) {
      onOpenAIChat(message);
    }
  };

  // Reminder modal functions
  const handleSetReminder = async (reminderData: {
    type: 'follow_up' | 'deadline' | 'callback';
    datetime: string;
    note?: string;
  }) => {
    try {
      if (!selectedThreadId || !currentFlow) {
        alert('No conversation selected');
        return;
      }

      // Convert datetime to ISO timestamp for scheduling
      const scheduledTime = new Date(reminderData.datetime).toISOString();
      
      const payload = {
        threadId: selectedThreadId,
        userId: user!.userId,
        userEmail: user!.email, // User's email for sending reminder to themselves
        reminderType: reminderData.type,
        scheduledTime: scheduledTime,
        note: reminderData.note || '',
        threadTitle: getThreadTitle(selectedThreadId),
        contactEmail: currentFlow.fromEmail || currentFlow.fromPhone || 'Unknown Contact'
      };

      console.log('Setting reminder with payload:', payload);
      
      // Call API to store reminder and schedule it
      const response = await fetch('https://8zsaycb149.execute-api.us-east-1.amazonaws.com/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Reminder created:', result);
      
      alert('Reminder set successfully! You will receive an email at the scheduled time.');
      setShowReminderModal(false);
    } catch (error: any) {
      console.error('Failed to set reminder:', error);
      alert(`Failed to set reminder: ${error.message}`);
    }
  };

  // Helper function to format email addresses with truncation
  const formatEmailAddress = (email: string): string => {
    if (!email) return email;
    
    // If email is 20 characters or less, show it as-is
    if (email.length <= 20) {
      return email;
    }
    
    // If longer than 20 chars, truncate and add "..."
    return email.substring(0, 17) + '...';
  };

  // Helper function to get thread title (same as in other components)
  const getThreadTitle = (threadId: string): string => {
    const flow = flows.find(f => f.flowId === threadId);
    if (!flow) return 'Unknown Conversation';
    
    // Prioritize showing email addresses (formatted) - same priority as ThreadList
    if (flow.contactEmail) {
      const formatted = formatEmailAddress(flow.contactEmail);
      console.log('InboxContainer - Formatting contactEmail:', flow.contactEmail, '→', formatted);
      return formatted;
    }
    if (flow.fromEmail) {
      const formatted = formatEmailAddress(flow.fromEmail);
      console.log('InboxContainer - Formatting fromEmail:', flow.fromEmail, '→', formatted);
      return formatted;
    }
    
    // Fallback to phone number for WhatsApp
    if (flow.contactPhone) {
      return flow.contactPhone;
    }
    if (flow.fromPhone) {
      return flow.fromPhone;
    }
    
    // Final fallbacks
    return flow.contactName || flow.subject || `${threadId.slice(0, 8)}`;
  };

  // Reminder Modal Component
  const ReminderModal = () => {
    const [reminderType, setReminderType] = useState<'follow_up' | 'deadline' | 'callback'>('follow_up');
    const [reminderDateTime, setReminderDateTime] = useState('');
    const [reminderNote, setReminderNote] = useState('');

    // Set default datetime to 1 hour from now
    useEffect(() => {
      
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const isoString = now.toISOString();
      setReminderDateTime(isoString.slice(0, 16)); // Format for datetime-local input
    }, []);

    if (!showReminderModal) return null;

    return (
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
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827'
            }}>
              Set Reminder
            </h3>
            <button
              onClick={() => setShowReminderModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              ×
            </button>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Reminder Type */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Reminder Type
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  background: '#fff'
                }}
              >
                <option value="follow_up">Follow Up</option>
                <option value="deadline">Deadline</option>
                <option value="callback">Callback</option>
              </select>
            </div>

            {/* Date & Time */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Remind me on
              </label>
              <input
                type="datetime-local"
                value={reminderDateTime}
                onChange={(e) => setReminderDateTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151'
                }}
              />
            </div>

            {/* Note */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Note (optional)
              </label>
              <textarea
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                placeholder="Add a note for this reminder..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '8px'
            }}>
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!reminderDateTime) {
                    alert('Please select a date and time for the reminder.');
                    return;
                  }
                  handleSetReminder({
                    type: reminderType,
                    datetime: reminderDateTime,
                    note: reminderNote
                  });
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#DE1785',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#BE185D'}
                onMouseLeave={e => e.currentTarget.style.background = '#DE1785'}
              >
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Loading inbox..." 
        submessage="Fetching your latest conversations and messages"
      />
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
      height: '100%',
      background: '#f9fafb',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
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
          background: '#FFFBFA',
          zIndex: 1002,
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
                    zIndex: 1001,
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

            {/* Set Reminder button */}
            <button 
              onClick={() => setShowReminderModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Set Reminder"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content area - no margin here, let ThreadList handle its own spacing */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: '100%'
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
          onCategoryFilterChange={handleCategoryFilterChange}
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
            onCategoryFilterChange={handleCategoryFilterChange}
            onFlowUpdate={handleFlowUpdate}
            onOpenAIChat={handleOpenAIChatLocal}
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

      {/* Reminder Modal */}
      <ReminderModal />



    </div>
  );
};

export default InboxContainer; 