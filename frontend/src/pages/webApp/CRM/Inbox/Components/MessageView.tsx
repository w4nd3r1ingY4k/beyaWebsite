import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/pages/AuthContext";
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
  mediaUrl?: string;
  mediaType?: string;
  originalMessageId?: string;
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
  categoryFilter?: string[];
  onCategoryFilterChange?: (categories: string[]) => void;
  onFlowUpdate?: (updatedFlow: any) => void;
  onOpenAIChat?: (message: string) => void; // New prop for opening AI chat with a message
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
  onFlowUpdate,
  onOpenAIChat
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
  
  // Mock tonality analysis feature
  const [showTonalityWarning, setShowTonalityWarning] = useState(false);

  // Header controls state - use external filters if provided
  const statusFilter = externalStatusFilter;
  const categoryFilter = externalCategoryFilter || [];

  // Tag dropdown state
  const [showPrimaryTagDropdown, setShowPrimaryTagDropdown] = useState(false);
  const [showSecondaryTagDropdown, setShowSecondaryTagDropdown] = useState(false);
  const [primaryTagSearch, setPrimaryTagSearch] = useState('');
  const [secondaryTagSearch, setSecondaryTagSearch] = useState('');

  // Local flow state for immediate UI updates
  const [localFlow, setLocalFlow] = useState(flow);

  const emailEditorRef = useRef<Editor | null>(null);
  const primaryTagDropdownRef = useRef<HTMLDivElement>(null);
  const secondaryTagDropdownRef = useRef<HTMLDivElement>(null);

  // Predefined tag options - separated into primary and secondary
  const primaryTagOptions = ['sales', 'logistics', 'support'];
  const secondaryTagOptions = ['urgent', 'vip', 'complex', 'enterprise', 'follow-up', 'escalated'];

  useEffect(() => {
    if (selectedThreadId) {
      loadTeamMessages(selectedThreadId);
    } else {
      setTeamMessages([]);
    }
  }, [selectedThreadId]);

  // Sync local flow state when prop changes
  useEffect(() => {
    setLocalFlow(flow);
  }, [flow]);

  // Effect to handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (primaryTagDropdownRef.current && !primaryTagDropdownRef.current.contains(e.target as Node)) {
        setShowPrimaryTagDropdown(false);
      }
      if (secondaryTagDropdownRef.current && !secondaryTagDropdownRef.current.contains(e.target as Node)) {
        setShowSecondaryTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // COMMENTED OUT - Original send reply functionality
  const handleReplySend = async () => {
    if (!selectedThreadId) return;

    try {
      const channel = getChannel(selectedThreadId);
      
      if (channel === 'email') {
        const rawContentState = convertToRaw(emailEditorState.getCurrentContent());
        const htmlContent = draftToHtml(rawContentState);
        const plainText = emailEditorState.getCurrentContent().getPlainText();
        
        // Get recipient from flow or use the decoded threadId as fallback
        const recipient = flow?.contactEmail || decodeURIComponent(selectedThreadId);
        
        // Find the most recent incoming message to get the original subject
        const incomingMessages = messages.filter(msg => msg.Direction === 'incoming');
        const latestIncoming = incomingMessages.sort((a, b) => b.Timestamp - a.Timestamp)[0];
        
        // Auto-populate subject if empty (use original subject with Re: prefix)
        let finalSubject = replySubject;
        if (!finalSubject && latestIncoming && latestIncoming.Subject) {
          finalSubject = latestIncoming.Subject.startsWith('Re:') ? 
            latestIncoming.Subject : 
            `Re: ${latestIncoming.Subject}`;
        }
        
        console.log('📧 Replying with info:', {
          recipient,
          subject: finalSubject,
          hasLatestIncoming: !!latestIncoming,
          note: 'Backend will automatically find correct Message-ID for threading'
        });
        
        // DON'T pass originalMessageId - let the backend look it up automatically!
        // The backend has the correct logic to find the Message-ID from Headers
        await onSendMessage({
          channel: 'email',
          to: recipient,
          subject: finalSubject || 'Re: (no subject)',
          content: plainText,
          html: htmlContent
          // No originalMessageId - backend will auto-detect from database!
        });
        
        setEmailEditorState(EditorState.createEmpty());
        setReplySubject('');
      } else {
        // Get recipient from flow or use the decoded threadId as fallback
        const recipient = flow?.contactPhone || decodeURIComponent(selectedThreadId);
        
        await onSendMessage({
          channel: 'whatsapp',
          to: recipient,
          content: replyText
        });
        
        setReplyText('');
      }
      
      setIsReplying(false);
    } catch (err) {
      console.error('Error sending reply:', err);
    }
  };

  // Mock tonality analysis feature for customer replies
  // const handleTonalityCheck = () => {
  //   if (!selectedThreadId) return;

  //   const channel = getChannel(selectedThreadId);
  //   let messageContent = '';
    
  //   if (channel === 'email') {
  //     messageContent = emailEditorState.getCurrentContent().getPlainText();
  //   } else {
  //     messageContent = replyText;
  //   }

  //   if (!messageContent.trim()) return;
    
  //   // Mock analysis - trigger warning for messages that seem too casual for Danny from Pipedream
  //   const casualIndicators = ['hey', 'sup', 'what\'s up', 'yo', 'dude', 'lol', 'haha', 'thanks!', 'cool', 'awesome'];
  //   const isCasual = casualIndicators.some(indicator => 
  //     messageContent.toLowerCase().includes(indicator)
  //   );
    
  //   if (isCasual) {
  //     setShowTonalityWarning(true);
  //   } else {
  //     // If tonality is fine, proceed with normal sending (commented out for now)
  //     // handleReplySend();
  //     alert('Message would be sent normally (feature mocked)');
  //   }
  // };

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

  // Update flow function for tag changes - using the same API as MessageList
  const updateFlow = async (flowId: string, updates: Record<string, any>) => {
    // Ensure userId is present in updates
    const payload = {
      ...updates,
      userId: user!.userId // Add userId from auth context
    };

    const FUNCTION_URL =
      'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws';

    const res = await fetch(
      `${FUNCTION_URL}/flows/${encodeURIComponent(flowId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // Handle primary tag selection (exclusive)
  const handlePrimaryTagSelect = async (tag: string) => {
    if (!selectedThreadId || !localFlow) {
      alert('No conversation selected');
      return;
    }

    try {
      // Get existing secondary tags
      const existingSecondaryTags = Array.isArray(localFlow.secondaryTags) ? localFlow.secondaryTags : [];
      
      // Primary tag is exclusive - set or clear
      const newPrimaryTag = tag === '' ? undefined : tag;
      
      // Update local state immediately
      const updatedLocalFlow = {
        ...localFlow,
        primaryTag: newPrimaryTag,
        secondaryTags: existingSecondaryTags,
        // Legacy cleanup
        tags: undefined,
        category: undefined
      };
      setLocalFlow(updatedLocalFlow);
      
      // Call API
      console.log('Updating primary tag:', { 
        flowId: localFlow.flowId,
        primaryTag: newPrimaryTag,
        secondaryTags: existingSecondaryTags 
      });
      
      const updated = await updateFlow(localFlow.flowId, { 
        primaryTag: newPrimaryTag,
        secondaryTags: existingSecondaryTags,
        tags: undefined,
        category: undefined
      });
      
      console.log('Primary tag update response:', updated);
      console.log('Primary tag response keys:', Object.keys(updated));
      console.log('Primary tag response.updated:', updated.updated);

      if (onFlowUpdate) {
        // Check if response has nested structure
        const flowToUpdate = updated.updated || updated;
        console.log('Sending to onFlowUpdate:', flowToUpdate);
        onFlowUpdate(flowToUpdate);
      }
    } catch (err: any) {
      console.error('Failed to update primary tag:', err);
      alert('Could not update primary tag: ' + err.message);
      setLocalFlow(flow);
    }
  };

  // Handle secondary tag selection (multiple)
  const handleSecondaryTagSelect = async (tag: string) => {
    if (!selectedThreadId || !localFlow) {
      alert('No conversation selected');
      return;
    }

    try {
      const existingPrimaryTag = localFlow.primaryTag;
      const existingSecondaryTags = Array.isArray(localFlow.secondaryTags) ? localFlow.secondaryTags : [];
      
      // Handle clear all secondary tags
      let updatedSecondaryTags: string[];
      if (tag === '') {
        updatedSecondaryTags = [];
      } else {
        // Toggle secondary tag
        updatedSecondaryTags = existingSecondaryTags.includes(tag)
          ? existingSecondaryTags.filter((t: string) => t !== tag)
          : [...existingSecondaryTags, tag];
      }
      
      // Update local state immediately
      const updatedLocalFlow = {
        ...localFlow,
        primaryTag: existingPrimaryTag,
        secondaryTags: updatedSecondaryTags,
        tags: undefined,
        category: undefined
      };
      setLocalFlow(updatedLocalFlow);
      
      // Call API
      console.log('Updating secondary tags:', { 
        flowId: localFlow.flowId,
        primaryTag: existingPrimaryTag,
        secondaryTags: updatedSecondaryTags 
      });
      
      const updated = await updateFlow(localFlow.flowId, { 
        primaryTag: existingPrimaryTag,
        secondaryTags: updatedSecondaryTags,
        tags: undefined,
        category: undefined
      });
      
      console.log('Secondary tags update response:', updated);
      console.log('Secondary tags response keys:', Object.keys(updated));
      console.log('Secondary tags response.updated:', updated.updated);

      if (onFlowUpdate) {
        // Check if response has nested structure
        const flowToUpdate = updated.updated || updated;
        console.log('Sending to onFlowUpdate (secondary):', flowToUpdate);
        onFlowUpdate(flowToUpdate);
      }
    } catch (err: any) {
      console.error('Failed to update secondary tags:', err);
      alert('Could not update secondary tags: ' + err.message);
      setLocalFlow(flow);
    }
  };

  const addParticipant = async (flowId: string, newEmail: string) => {
    try {
      // 1) Find the flow object in state (assuming we have access to flows through flow prop)
      if (!flow) {
        throw new Error("Flow not found");
      }

      // 2) Lookup the userId for `newEmail`
      let lookupResponse: Response;
      try {
        lookupResponse = await fetch(`${API_BASE}/users/email?email=${encodeURIComponent(newEmail)}`);
      } catch (networkErr) {
        console.error("Network error while looking up email:", networkErr);
        throw new Error("Could not reach user‐lookup service");
      }

      if (lookupResponse.status === 404) {
        // The user wasn't found in the Users table
        throw new Error(`No user found with email "${newEmail}"`);
      }

      if (!lookupResponse.ok) {
        // Some other error (500, etc.)
        const errBody = await lookupResponse.text().catch(() => null);
        console.error("Error from user‐lookup endpoint:", lookupResponse.status, errBody);
        throw new Error("Error looking up user by email");
      }

      // 3) Parse the JSON to get the userId
      const userRecord = (await lookupResponse.json()) as { userId: string; [key: string]: any };
      const newUserId = userRecord.userId;
      if (!newUserId) {
        console.error("Lookup returned no userId:", userRecord);
        throw new Error("Invalid lookup result: missing userId");
      }

      // 4) Grab existing participants (userIds) or default to empty array
      const existing: string[] = Array.isArray(flow.participants)
        ? flow.participants
        : [];

      // 5) Dedupe via a Set, then add the new userId
      const deduped = new Set(existing);
      deduped.add(newUserId);

      // 6) Convert back to array
      const updatedParticipants = Array.from(deduped);

      // 7) Call updateFlow using the Lambda URL approach
      const FUNCTION_URL = 'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws';
      
      const payload = {
        participants: updatedParticipants,
        userId: user!.userId // Add userId from auth context
      };

      const res = await fetch(`${FUNCTION_URL}/flows/${encodeURIComponent(flowId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      console.log('Participant added successfully:', result);

      // 8) Update local state if we have a callback
      if (onFlowUpdate && result.updated) {
        onFlowUpdate(result.updated);
      }

    } catch (err: any) {
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

  // Helper functions for delete operations
  const handleSoftDelete = async () => {
    if (!selectedThreadId || !localFlow) {
      alert('No conversation selected');
      return;
    }

    try {
      const existingSecondaryTags = Array.isArray(localFlow.secondaryTags) ? localFlow.secondaryTags : [];
      
      // Add 'deleted' tag if not already present
      if (!existingSecondaryTags.includes('deleted')) {
        const updatedSecondaryTags = [...existingSecondaryTags, 'deleted'];
        
        const updated = await updateFlow(localFlow.flowId, { 
          primaryTag: localFlow.primaryTag,
          secondaryTags: updatedSecondaryTags
        });

        if (onFlowUpdate) {
          const flowToUpdate = updated.updated || updated;
          onFlowUpdate(flowToUpdate);
        }

        alert('Conversation moved to deleted items');
      }
    } catch (error: any) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation: ' + error.message);
    }
  };

  const handleRestore = async () => {
    if (!selectedThreadId || !localFlow) {
      alert('No conversation selected');
      return;
    }

    try {
      const existingSecondaryTags = Array.isArray(localFlow.secondaryTags) ? localFlow.secondaryTags : [];
      
      // Remove 'deleted' tag if present
      if (existingSecondaryTags.includes('deleted')) {
        const updatedSecondaryTags = existingSecondaryTags.filter((tag: string) => tag !== 'deleted');
        
        const updated = await updateFlow(localFlow.flowId, { 
          primaryTag: localFlow.primaryTag,
          secondaryTags: updatedSecondaryTags
        });

        if (onFlowUpdate) {
          const flowToUpdate = updated.updated || updated;
          onFlowUpdate(flowToUpdate);
        }

        alert('Conversation restored');
      }
    } catch (error: any) {
      console.error('Failed to restore conversation:', error);
      alert('Failed to restore conversation: ' + error.message);
    }
  };

  const handleHardDelete = async () => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this conversation? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      // TODO: Implement actual hard delete endpoint
      alert('Hard delete feature needs to be implemented with a DELETE API endpoint');
    } catch (error: any) {
      console.error('Failed to permanently delete conversation:', error);
      alert('Failed to permanently delete conversation: ' + error.message);
    }
  };

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
      marginTop: selectedThreadId ? '60px' : '0', // Add top margin when status bar is visible
      background: '#FBF7F7' // Match the overall background color scheme
    }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
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
            boxSizing: 'border-box',
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Tag Header Section - Now sticky */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '0px 0',
              gap: '32px',
              position: 'sticky',
              top: 0,
              backgroundColor: '#FBF7F7',
              zIndex: 10,
              marginBottom: '10px'
            }}>
              {/* Primary Tag dropdown */}
              <div style={{ position: 'relative' }} ref={primaryTagDropdownRef}>
                <button
                  onClick={() => setShowPrimaryTagDropdown(!showPrimaryTagDropdown)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Primary
                  {/* Display primary tag */}
                  {localFlow?.primaryTag && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrimaryTagSelect('');
                      }}
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '12px',
                        marginLeft: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#1d4ed8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                      }}
                    >
                      {localFlow.primaryTag.charAt(0).toUpperCase() + localFlow.primaryTag.slice(1)}
                      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>×</span>
                    </span>
                  )}
                </button>
                {showPrimaryTagDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px',
                      minWidth: '160px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                    }}
                  >
                    <div style={{ marginBottom: '4px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                      Department (choose one):
                    </div>
                    {primaryTagOptions.map(tag => {
                      const isSelected = localFlow?.primaryTag === tag;
                      return (
                        <div
                          key={tag}
                          onClick={() => handlePrimaryTagSelect(tag)}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: isSelected ? '#2563eb' : '#374151',
                            background: isSelected ? '#dbeafe' : 'transparent',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: isSelected ? '500' : '400'
                          }}
                          onMouseEnter={e => {
                            if (isSelected) {
                              e.currentTarget.style.background = '#bfdbfe';
                            } else {
                              e.currentTarget.style.background = '#f3f4f6';
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = isSelected ? '#dbeafe' : 'transparent';
                          }}
                        >
                          <span>{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                          {isSelected && (
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Secondary Tags dropdown */}
              <div style={{ position: 'relative' }} ref={secondaryTagDropdownRef}>
                <button
                  onClick={() => setShowSecondaryTagDropdown(!showSecondaryTagDropdown)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Tags
                  {/* Display secondary tags */}
                  {(() => {
                    const secondaryTags = Array.isArray(localFlow?.secondaryTags) ? localFlow.secondaryTags : [];
                    return secondaryTags.slice(0, 2).map((tag: string, index: number) => (
                      <span
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSecondaryTagSelect(tag);
                        }}
                        style={{
                          background: '#DE1785',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px',
                          marginLeft: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#B91C5C';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#DE1785';
                        }}
                      >
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>×</span>
                      </span>
                    ));
                  })()}
                  {(() => {
                    const secondaryTags = Array.isArray(localFlow?.secondaryTags) ? localFlow.secondaryTags : [];
                    return secondaryTags.length > 2 && (
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                        +{secondaryTags.length - 2} more
                      </span>
                    );
                  })()}
                </button>
                {showSecondaryTagDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px',
                      minWidth: '180px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                    }}
                  >
                    <input
                      type="text"
                      value={secondaryTagSearch}
                      onChange={e => setSecondaryTagSearch(e.target.value)}
                      placeholder="Search tags..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginBottom: '8px',
                      }}
                    />
                    <div style={{ marginBottom: '4px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                      Attributes (choose multiple):
                    </div>
                    <div style={{ height: '100%', overflowY: 'auto' }}>
                      {(() => {
                        const filteredTags = secondaryTagOptions.filter((t: string) => 
                          t.toLowerCase().includes(secondaryTagSearch.toLowerCase())
                        );
                        const hasExactMatch = secondaryTagOptions.some((t: string) => 
                          t.toLowerCase() === secondaryTagSearch.toLowerCase()
                        );
                        const showCreateOption = secondaryTagSearch.trim() && !hasExactMatch;
                        
                        return (
                          <>
                            {showCreateOption && (
                              <div
                                onClick={() => handleSecondaryTagSelect(secondaryTagSearch.trim())}
                                style={{
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  color: '#DE1785',
                                  background: '#fff',
                                  fontWeight: '500',
                                  borderBottom: '1px solid #eee',
                                  marginBottom: '4px',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                              >
                                + Create "{secondaryTagSearch.trim()}"
                              </div>
                            )}
                            
                            {filteredTags.map((t: string) => {
                              const secondaryTags = Array.isArray(localFlow?.secondaryTags) ? localFlow.secondaryTags : [];
                              const isSelected = secondaryTags.includes(t);
                              
                              return (
                                <div
                                  key={t}
                                  onClick={() => handleSecondaryTagSelect(t)}
                                  style={{
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: isSelected ? '#DE1785' : '#374151',
                                    background: isSelected ? '#FDE7F1' : 'transparent',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: isSelected ? '500' : '400'
                                  }}
                                  onMouseEnter={e => {
                                    if (isSelected) {
                                      e.currentTarget.style.background = '#FBB6CE';
                                      e.currentTarget.style.color = '#BE185D';
                                    } else {
                                      e.currentTarget.style.background = '#f3f4f6';
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = isSelected ? '#FDE7F1' : 'transparent';
                                    e.currentTarget.style.color = isSelected ? '#DE1785' : '#374151';
                                  }}
                                >
                                  <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                  {isSelected && (
                                    <span style={{ 
                                      fontSize: '12px', 
                                      fontWeight: 'bold',
                                      color: '#DE1785'
                                    }}>
                                      ✓ Click to remove
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                      {Array.isArray(localFlow?.secondaryTags) && localFlow.secondaryTags.length > 0 && (
                        <div
                          onClick={() => handleSecondaryTagSelect('')}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#374151',
                            background: 'transparent',
                            transition: 'background 0.2s',
                            marginTop: '4px',
                            borderTop: '1px solid #eee'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          Clear all tags
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Delete/Restore Actions */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {localFlow && Array.isArray(localFlow.secondaryTags) && localFlow.secondaryTags.includes('deleted') ? (
                  // Show restore and hard delete buttons for deleted items
                  <>
                    <button
                      onClick={handleRestore}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: '1px solid #10b981',
                        background: 'transparent',
                        color: '#10b981',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#10b981';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#10b981';
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={handleHardDelete}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: '1px solid #ef4444',
                        background: 'transparent',
                        color: '#ef4444',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                    >
                      Delete Forever
                    </button>
                  </>
                ) : (
                  // Show delete button for normal items
                  <button
                    onClick={handleSoftDelete}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: '1px solid #6b7280',
                      background: 'transparent',
                      color: '#6b7280',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#6b7280';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Messages container - Now scrollable */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingTop: '16px'
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
                      padding: 16,
                      paddingBottom: 20,
                      borderRadius: 8,
                      background: '#FFFBFA',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid #f0f0f0',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      
                      maxHeight: isActive ? 'none' : '110px',
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
                        color: isActive ? '#666' : '#888',
                        fontWeight: '500',
                        opacity: isActive ? 1 : 0.8,
                        transition: 'opacity 0.3s ease, color 0.3s ease'
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
                      maxWidth: '100%',
                      opacity: isActive ? 1 : 0.7,
                      transition: 'opacity 0.3s ease',
                      color: isActive ? '#333' : '#666'
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
          </div>
        )}
      </div>

      {/* Inline Reply Interface */}
      {isReplying && (
        <div style={{
          padding: '16px',
          background: '#fff',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16 
          }}>
            <h3 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: '600' }}>Reply to Customer</h3>
            <button
              onClick={() => {
                setIsReplying(false);
                setShowTonalityWarning(false); // Reset warning when closing
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#6b7280',
                padding: 4
              }}
            >
              ×
            </button>
          </div>

          {/* Tonality Warning Speech Bubble */}
          {showTonalityWarning && (
            <div 
              onClick={() => {
                if (onOpenAIChat) {
                  // Get the message content for context
                  const channel = getChannel(selectedThreadId!);
                  let messageContent = '';
                  
                  if (channel === 'email') {
                    messageContent = emailEditorState.getCurrentContent().getPlainText();
                  } else {
                    messageContent = replyText;
                  }
                  
                  // Prepare the AI thought message
                  const thoughtMessage = `Analyzing message: "${messageContent}"\n\nThe tone of this message would be better phrased as a question for a demo rather than stating the demo as a fact. This approach feels more consultative and gives the prospect control over the decision.`;
                  
                  onOpenAIChat(thoughtMessage);
                  setShowTonalityWarning(false);
                }
              }}
              style={{
                position: 'relative',
                background: '#fbbf24',
                border: '1px solid #f59e0b',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fbbf24';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>🤖</span>
                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#92400e'
                  }}>
                    Attention: Moderate
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#92400e',
                    marginTop: '2px'
                  }}>
                    B has some input! Click to view chat.
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the main click
                  setShowTonalityWarning(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#92400e',
                  fontSize: '16px',
                  padding: '4px',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(146, 64, 14, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                ×
              </button>
              
              {/* Speech bubble tail */}
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '24px',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #fbbf24'
              }} />
            </div>
          )}

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
              onClick={() => {
                setIsReplying(false);
                setShowTonalityWarning(false); // Reset warning when canceling
              }}
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
      )}

      <div style={{ 
        padding: 16, 
        backgroundColor: '#FBF7F7', // Match the thread list background
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
          background: 'transparent', // Remove white background 
          borderRadius: 8,
          border: 'none', // Remove border
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


    </div>
  );
};

export default MessageView; 