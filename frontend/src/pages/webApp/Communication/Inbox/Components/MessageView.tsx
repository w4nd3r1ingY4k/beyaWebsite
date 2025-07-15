import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "../../../../AuthContext";
import { EditorState, convertToRaw, Editor } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import EmailReplyEditor from '../SendBox';
import WhatsAppTemplateSelector from './WhatsAppTemplateSelector';
import { getUserById } from '../../../../../userService';
import { discussionsService } from '../../../../../discussionsService';
import { Reply } from 'lucide-react';
import './MessageView.css';

import { API_ENDPOINTS } from '../../../../../config/api';
import DOMPurify from 'dompurify';

/**
 * Detect if a string is Base64 encoded
 */
const isBase64 = (str: string): boolean => {
  // Basic checks
  if (typeof str !== 'string' || str.length === 0) return false;
  if (str.length % 4 !== 0) return false;
  
  // Character set check
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(str)) return false;
  
  // Try to decode
  try {
    const decoded = atob(str);
    const reencoded = btoa(decoded);
    return reencoded === str;
  } catch (err) {
    return false;
  }
};

/**
 * Process message body to detect and handle Base64 content
 */
const processMessageBody = (messageBody: string): { body: string; isBase64: boolean; contentType: string | null; originalBase64?: string; decodedSize?: number } => {
  if (!messageBody || typeof messageBody !== 'string') {
    return { body: messageBody, isBase64: false, contentType: null };
  }

  // Check if the message body is Base64 encoded
  if (isBase64(messageBody)) {
    try {
      const decoded = atob(messageBody);
      const uint8Array = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        uint8Array[i] = decoded.charCodeAt(i);
      }
      
      // Detect content type based on file signature
      let contentType = 'unknown';
      if (uint8Array.length > 4) {
        const header = uint8Array.slice(0, 4);
        if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
          contentType = 'image/jpeg';
        } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
          contentType = 'image/png';
        } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
          contentType = 'image/gif';
        } else if (new TextDecoder().decode(header.slice(0, 4)) === 'RIFF') {
          contentType = 'video/webm'; // or audio/wav, would need more detection
        }
      }

      return {
        body: `[${contentType.toUpperCase()} ATTACHMENT - ${Math.round(uint8Array.length / 1024)}KB]`,
        isBase64: true,
        contentType: contentType,
        originalBase64: messageBody,
        decodedSize: uint8Array.length
      };
    } catch (err) {
      console.error('Error processing Base64 content:', err);
      return { body: messageBody, isBase64: false, contentType: null };
    }
  }

  return { body: messageBody, isBase64: false, contentType: null };
};

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
  originalMessageId?: string;
  HtmlBody?: string;
  Snippet?: string;
  InReplyTo?: string;
  GmailMessageId?: string;
  GmailThreadId?: string;
  Labels?: string[];
  Attachments?: any[];
  Headers?: any;
  Status?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  IsUnread?: boolean;
  FlowId?: string;
  FromAddress?: string;
  ToAddress?: string;
}

interface MessageViewProps {
  messages: APIMessage[];
  selectedThreadId: string | null;
  isLoading: boolean;
  onReply?: () => void;
  onShare?: (threadId: string) => void;
  onSendMessage?: (messageData: any) => Promise<void>;
  flow?: any;
  statusFilter?: Status | 'all';
  onStatusFilterChange?: (status: Status | 'all') => void;
  categoryFilter?: string[];
  onCategoryFilterChange?: (categories: string[]) => void;
  onFlowUpdate?: (updatedFlow: any) => void;
  onOpenAIChat?: (message: string) => void; // New prop for opening AI chat with a message
  currentView?: 'inbox' | 'discussions';
  onSendDiscussionMessage?: (content: string) => void;
  onDiscussionStatusSelect?: (status: 'open' | 'waiting' | 'resolved' | 'overdue') => void;
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

const API_BASE = API_ENDPOINTS.INBOX_API_BASE;

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
  onOpenAIChat,
  currentView = 'inbox',
  onSendDiscussionMessage,
  onDiscussionStatusSelect
}) => {
  const { user } = useAuth();
  
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
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
  const messageScrollContainerRef = useRef<HTMLDivElement>(null);
  const messageScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Predefined tag options - separated into primary and secondary
  const primaryTagOptions = ['sales', 'logistics', 'support'];
  const secondaryTagOptions = ['urgent', 'vip', 'complex', 'enterprise', 'follow-up', 'escalated'];

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Discussion message state
  const [discussionMessageInput, setDiscussionMessageInput] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  
  // Team discussion panel resize state
  const [discussionPanelHeight, setDiscussionPanelHeight] = useState(250); // Default height
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  useEffect(() => {
    if (selectedThreadId) {
      if (currentView === 'discussions') {
        // Don't load team messages for discussions
        setTeamMessages([]);
      } else {
        loadTeamMessages(selectedThreadId);
      }
    } else {
      setTeamMessages([]);
    }
  }, [selectedThreadId, currentView]);

  useEffect(() => {
    if (currentView === 'discussions' && flow?.createdBy) {
      getUserById(flow.createdBy)
        .then(user => {
          if (user?.subscriber_email) {
            setSubscriberEmail(user.subscriber_email);
          }
        })
        .catch(err => console.error('Failed to get subscriber email', err));
    } else {
      setSubscriberEmail('');
    }
  }, [flow, currentView]);

  // Sync local flow state when prop changes
  useEffect(() => {
    setLocalFlow(flow);
  }, [flow]);

  // Cleanup message scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (messageScrollTimeoutRef.current) {
        clearTimeout(messageScrollTimeoutRef.current);
      }
    };
  }, []);

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

  // Effect to handle resize mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaY = startY - e.clientY; // Inverted because we want dragging up to increase height
      const newHeight = Math.max(250, Math.min(600, startHeight + deltaY)); // Min 250px (default), max 600px
      setDiscussionPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startY, startHeight]);

  const loadTeamMessages = async (threadId: string) => {
    try {
      console.log('Loading team messages for thread:', threadId);
      const response = await fetch(`${API_ENDPOINTS.FLOW_COMMENTS}/flows/${encodeURIComponent(threadId)}/comments`);
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

  // Function to render Base64 content with preview
  function renderBase64Content(message: any) {
    if (!message.isBase64 || !message.originalBase64) {
      return linkifyWithImages(message.body);
    }

    const isImage = message.contentType && message.contentType.startsWith('image/');
    
    if (isImage) {
      const dataUrl = `data:${message.contentType};base64,${message.originalBase64}`;
      return (
        <div style={{ margin: '8px 0' }}>
          <img
            src={dataUrl}
            alt="Base64 Image"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid #e5e7eb'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const errorDiv = document.createElement('div');
              errorDiv.style.color = '#dc2626';
              errorDiv.style.fontSize = '14px';
              errorDiv.style.fontStyle = 'italic';
              errorDiv.textContent = 'Failed to load Base64 image';
              target.parentNode?.appendChild(errorDiv);
            }}
          />
        </div>
      );
    } else {
      // For non-image Base64 content, show the attachment info
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          background: '#fef3c7',
          borderRadius: '6px',
          border: '1px solid #fbbf24'
        }}>
          <span style={{ fontSize: '16px' }}>📄</span>
          <span style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
            {message.body}
          </span>
        </div>
      );
    }
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
        let recipient = flow?.contactEmail || flow?.contactIdentifier || flow?.fromEmail || decodeURIComponent(selectedThreadId);
        
        // IMPORTANT: Extract actual email address from flowId if needed
        if (selectedThreadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // If selectedThreadId is a UUID (flowId), look up the actual email address
          if (flow?.contactIdentifier || flow?.contactEmail || flow?.fromEmail) {
            recipient = flow.contactIdentifier || flow.contactEmail || flow.fromEmail;
            console.log(`🔄 Converted flowId ${selectedThreadId} to email address ${recipient}`);
          } else {
            console.error('❌ Could not find email address for flowId:', selectedThreadId);
            throw new Error('Could not find email address for this conversation');
          }
        }
        
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
        await onSendMessage?.({
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
        // For WhatsApp, pass the flowId (selectedThreadId) so routing logic can detect personal vs business
        await onSendMessage?.({
          channel: 'whatsapp',
          to: selectedThreadId, // Use flowId instead of extracted phone number
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
      const res = await fetch(`${API_ENDPOINTS.FLOW_COMMENTS}/flows/${safeId}/comments`, {
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

    const FUNCTION_URL = API_ENDPOINTS.FLOW_STATUS_UPDATE;

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

  // Update discussion function for tag and status changes
  const updateDiscussion = async (discussionId: string, updates: Record<string, any>) => {
    try {
      const result = await discussionsService.updateDiscussionStatus(discussionId, user!.userId, updates);
      return result;
    } catch (error) {
      console.error('Error updating discussion:', error);
      throw error;
    }
  };

  // Handle primary tag selection for discussions
  const handleDiscussionPrimaryTagSelect = async (tag: string) => {
    if (!selectedThreadId || !localFlow || currentView !== 'discussions') {
      alert('No discussion selected');
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
      };
      setLocalFlow(updatedLocalFlow);
      
      // Call API
      console.log('Updating discussion primary tag:', { 
        discussionId: localFlow.discussionId,
        primaryTag: newPrimaryTag,
        secondaryTags: existingSecondaryTags 
      });
      
      const updated = await updateDiscussion(localFlow.discussionId, { 
        primaryTag: newPrimaryTag,
        secondaryTags: existingSecondaryTags
      });
      
      console.log('Discussion primary tag update response:', updated);

      if (onFlowUpdate) {
        onFlowUpdate(updated);
      }
    } catch (err: any) {
      console.error('Failed to update discussion primary tag:', err);
      alert('Could not update primary tag: ' + err.message);
      setLocalFlow(flow);
    }
  };

  // Handle secondary tag selection for discussions
  const handleDiscussionSecondaryTagSelect = async (tag: string) => {
    if (!selectedThreadId || !localFlow || currentView !== 'discussions') {
      alert('No discussion selected');
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
      };
      setLocalFlow(updatedLocalFlow);
      
      // Call API
      console.log('Updating discussion secondary tags:', { 
        discussionId: localFlow.discussionId,
        primaryTag: existingPrimaryTag,
        secondaryTags: updatedSecondaryTags 
      });
      
      const updated = await updateDiscussion(localFlow.discussionId, { 
        primaryTag: existingPrimaryTag,
        secondaryTags: updatedSecondaryTags
      });
      
      console.log('Discussion secondary tags update response:', updated);

      if (onFlowUpdate) {
        onFlowUpdate(updated);
      }
    } catch (err: any) {
      console.error('Failed to update discussion secondary tags:', err);
      alert('Could not update secondary tags: ' + err.message);
      setLocalFlow(flow);
    }
  };

  // Handle primary tag selection (exclusive)
  const handlePrimaryTagSelect = async (tag: string) => {
    if (currentView === 'discussions') {
      return handleDiscussionPrimaryTagSelect(tag);
    }
    
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
    if (currentView === 'discussions') {
      return handleDiscussionSecondaryTagSelect(tag);
    }
    
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

  // Handle discussion status update
  const handleDiscussionStatusSelect = async (status: 'open' | 'waiting' | 'resolved' | 'overdue') => {
    if (!selectedThreadId || !localFlow || currentView !== 'discussions') {
      alert('No discussion selected');
      return;
    }

    try {
      // Update local state immediately
      const updatedLocalFlow = {
        ...localFlow,
        status: status,
      };
      setLocalFlow(updatedLocalFlow);
      
      // Call API
      console.log('Updating discussion status:', { 
        discussionId: localFlow.discussionId,
        status: status
      });
      
      const updated = await updateDiscussion(localFlow.discussionId, { 
        status: status
      });
      
      console.log('Discussion status update response:', updated);

      if (onFlowUpdate) {
        onFlowUpdate(updated);
      }
    } catch (err: any) {
      console.error('Failed to update discussion status:', err);
      alert('Could not update status: ' + err.message);
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
      const FUNCTION_URL = API_ENDPOINTS.FLOW_STATUS_UPDATE;
      
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
    
    // Database timestamps are already in milliseconds, use them directly
    return new Date(num).toISOString();
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

  // Helper function to get contact name for messages
  const getContactName = (): string => {
    if (!flow) return 'Customer';
    
    // First priority: Use the new contactIdentifier field
    if (flow.contactIdentifier) {
      return flow.contactIdentifier;
    }
    
    // Fallback: Existing contact fields for backward compatibility
    if (flow.contactEmail) {
      return flow.contactEmail;
    }
    if (flow.fromEmail) {
      return flow.fromEmail;
    }
    if (flow.contactPhone) {
      return flow.contactPhone;
    }
    if (flow.fromPhone) {
      return flow.fromPhone;
    }
    
    // BACKWARD COMPATIBILITY: For old flows where flowId IS the contact identifier
    if (flow.flowId && (flow.flowId.includes('@') || flow.flowId.startsWith('+'))) {
      return flow.flowId;
    }
    
    // Final fallbacks
    return flow.contactName || flow.customerName || 'Customer';
  };

  const normalizeMessage = (msg: APIMessage) => {
    // Check if the Body field contains HTML content
    const isHtmlContent = msg.Body && (
      msg.Body.includes('<!DOCTYPE') || 
      msg.Body.includes('<html') || 
      msg.Body.includes('<div') || 
      msg.Body.includes('<p>') ||
      msg.Body.includes('<table') ||
      msg.Body.includes('<style')
    );

    // Process message body for Base64 detection
    const rawBody = msg.Body || msg.Text || '';
    const processedMessage = processMessageBody(rawBody);

    return {
      id: msg.MessageId || `${msg.Timestamp || Date.now()}`,
      body: isHtmlContent ? (msg.Snippet || 'HTML Email') : processedMessage.body,
      htmlBody: isHtmlContent ? msg.Body : (msg.HtmlBody || ''),
      direction: msg.Direction || 'incoming',
      timestamp: formatTimestamp(msg.Timestamp),
      channel: msg.Channel || 'email',
      threadId: msg.ThreadId || '',
      senderName: msg.Direction === 'incoming' ? getContactName() : 'You',
      subject: msg.Subject || '',
      text: isHtmlContent ? (msg.Snippet || 'HTML Email') : processedMessage.body,
      sender: msg.FromAddress,
      recipient: msg.ToAddress,
      flowId: msg.FlowId,
      messageId: msg.MessageId,
      isUnread: msg.IsUnread || false,
      isAI: false,
      inReplyTo: msg.InReplyTo,
      gmailMessageId: msg.GmailMessageId,
      gmailThreadId: msg.GmailThreadId,
      snippet: msg.Snippet,
      labels: msg.Labels || [],
      attachments: msg.Attachments || [],
      headers: msg.Headers || {},
      status: msg.Status || 'active',
      createdAt: msg.CreatedAt,
      updatedAt: msg.UpdatedAt,
      // Add Base64 metadata
      isBase64: processedMessage.isBase64,
      contentType: processedMessage.contentType,
      originalBase64: processedMessage.originalBase64,
      decodedSize: processedMessage.decodedSize
    };
  };

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

  // Handle WhatsApp template selection
  const handleTemplateSelect = async (template: any, templateParams?: any) => {
    if (!selectedThreadId) return;
    
    if (!template) {
      // User closed template selector
      setShowTemplateSelector(false);
      return;
    }
    
    try {
      // Get recipient from flow or use the decoded threadId as fallback
      const recipient = flow?.contactPhone || decodeURIComponent(selectedThreadId);
      
      // Send template message
      await onSendMessage?.({
        channel: 'whatsapp',
        to: recipient,
        templateName: templateParams.templateName,
        templateLanguage: templateParams.templateLanguage,
        templateComponents: templateParams.templateComponents
      });
      
      // Close template selector and reply interface
      setShowTemplateSelector(false);
      setIsReplying(false);
      
    } catch (err) {
      console.error('Error sending template:', err);
      alert('Failed to send template message');
    }
  };

  // Discussion message handlers
  const handleDiscussionSend = () => {
    if (!discussionMessageInput.trim() || !onSendDiscussionMessage) return;
    
    onSendDiscussionMessage?.(discussionMessageInput);
    setDiscussionMessageInput('');
  };

  const handleDiscussionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDiscussionSend();
    }
  };

  // Handle message scroll events to show/hide scrollbar
  const handleMessageScroll = () => {
    const container = messageScrollContainerRef.current;
    if (!container) return;

    // Show scrollbar immediately
    container.classList.add('scrolling');

    // Clear existing timeout
    if (messageScrollTimeoutRef.current) {
      clearTimeout(messageScrollTimeoutRef.current);
    }

    // Hide scrollbar after 500ms of no scrolling
    messageScrollTimeoutRef.current = setTimeout(() => {
      container.classList.remove('scrolling');
    }, 500);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartY(e.clientY);
    setStartHeight(discussionPanelHeight);
  };

  // Polling is handled by the parent InboxContainer component

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
        overflow: 'hidden',
        background: '#FBF7F7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {currentView === 'discussions' ? '💬' : '💬'}
          </div>
          <h3 style={{ color: '#111827' }}>
            {currentView === 'discussions' ? 'Select a discussion' : 'Select a conversation'}
          </h3>
          <p style={{ color: '#6b7280' }}>
            {currentView === 'discussions' 
              ? 'Choose a discussion from the sidebar to view messages' 
              : 'Choose a conversation from the sidebar to view messages'}
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && currentView === 'inbox') {
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

  // If we're in discussions view, render the discussion chat
  if (currentView === 'discussions') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: selectedThreadId ? 'calc(100% - 60px)' : '100%',
        marginTop: selectedThreadId ? '60px' : '0',
        background: '#FBF7F7'
      }}>
        {selectedThreadId ? (
          <>
            {/* Discussion Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              background: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {flow?.title || 'Discussion'}
                </h2>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  {subscriberEmail || 'Loading...'}
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                <span>👥 {flow?.participantNames?.length || 0} participants</span>
                <span>💬 {flow?.messageCount || 0} messages</span>
              </div>
            </div>

            {/* Discussion Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: '#FBF7F7'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  padding: '40px 20px'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '16px' }}>💬</div>
                  <h3>Start the conversation</h3>
                  <p>Be the first to share your thoughts in this discussion.</p>
                </div>
              ) : (
                messages.map((message: any) => {
                  const isOwnMessage = message.authorId === user?.userId;
                  const getInitials = (name: string) => {
                    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
                  };
                  
                  const getAvatarColor = (name: string) => {
                    const colors = ['#DE1785', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
                    const index = name.length % colors.length;
                    return colors[index];
                  };

                  const formatTime = (timestamp: string) => {
                    const date = new Date(timestamp);
                    const now = new Date();
                    const diff = now.getTime() - date.getTime();
                    const minutes = Math.floor(diff / 60000);
                    const hours = Math.floor(diff / 3600000);
                    const days = Math.floor(diff / 86400000);

                    if (minutes < 1) return 'Just now';
                    if (minutes < 60) return `${minutes}m ago`;
                    if (hours < 24) return `${hours}h ago`;
                    if (days < 7) return `${days}d ago`;
                    return date.toLocaleDateString();
                  };

                  return (
                    <div
                      key={message.messageId}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '16px',
                        background: '#FEFCFC',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: '1px solid rgba(229, 231, 235, 0.3)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: getAvatarColor(message.authorName),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        flexShrink: 0
                      }}>
                        {getInitials(message.authorName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
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
                          fontSize: '14px',
                          color: '#374151',
                          lineHeight: '1.5'
                        }}>
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Discussion Input */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              background: 'transparent'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px'
              }}>
                <div style={{
                  flex: 1,
                  minHeight: '40px',
                  maxHeight: '120px',
                  position: 'relative'
                }}>
                  <textarea
                    value={discussionMessageInput}
                    onChange={(e) => setDiscussionMessageInput(e.target.value)}
                    onKeyPress={handleDiscussionKeyPress}
                    placeholder="Type your message..."
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      maxHeight: '120px',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '20px',
                      fontSize: '14px',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      background: 'transparent'
                    }}
                  />
                </div>
                <button
                  onClick={handleDiscussionSend}
                  disabled={!discussionMessageInput.trim()}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: discussionMessageInput.trim() ? '#DE1785' : '#d1d5db',
                    color: '#fff',
                    border: 'none',
                    cursor: discussionMessageInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    transition: 'all 0.2s'
                  }}
                >
                  →
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FBF7F7'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <h3 style={{ color: '#111827' }}>Select a discussion</h3>
              <p style={{ color: '#6b7280' }}>Choose a discussion from the sidebar to view messages</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular inbox view
  return (
    <>
      {/* Custom scrollbar styles for messages */}
      <style>{`
        .message-custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .message-custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .message-custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(222, 23, 133, 0.3);
          border-radius: 2px;
          min-height: 40px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .message-custom-scrollbar.scrolling::-webkit-scrollbar-thumb {
          opacity: 1;
        }
        .message-custom-scrollbar.scrolling::-webkit-scrollbar-thumb:hover {
          background: #C91476;
        }
        .message-custom-scrollbar {
          scrollbar-width: none;
        }
        .message-custom-scrollbar.scrolling {
          scrollbar-width: thin;
          scrollbar-color: #DE1785 transparent;
        }
      `}</style>
      
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
              padding: '0 16px',
              gap: '8px',
              position: 'sticky',
              top: 0,
              backgroundColor: 'transparent',
              zIndex: 10,
              marginBottom: '10px'
            }}>
              {/* Secondary Tags dropdown */}
              <div style={{ position: 'relative' }} ref={secondaryTagDropdownRef}>
                <button
                  onClick={() => setShowSecondaryTagDropdown(!showSecondaryTagDropdown)}
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.18s"
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
                {/* Share button */}
                <button
                  onClick={() => {
                    if (onShare && selectedThreadId) {
                      onShare(selectedThreadId);
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#6b7280",
                    transition: "all 0.18s"
                  }}
                >
                  Share
                </button>

                {localFlow && Array.isArray(localFlow.secondaryTags) && localFlow.secondaryTags.includes('deleted') ? (
                  // Show restore and hard delete buttons for deleted items
                  <>
                    <button
                      onClick={handleRestore}
                      style={{
                        padding: "8px 12px",
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#6b7280",
                        transition: "all 0.18s"
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={handleHardDelete}
                      style={{
                        padding: "8px 12px",
                        background: "transparent",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#6b7280",
                        transition: "all 0.18s"
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
                      padding: "8px 12px",
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "#6b7280",
                      transition: "all 0.18s"
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Messages container - Now scrollable */}
            <div 
              ref={messageScrollContainerRef}
              onScroll={handleMessageScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingTop: '16px'
              }}
              className="message-custom-scrollbar"
            >
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
                      width: 'calc(100% - 16px)',
                      maxWidth: 'calc(100% - 16px)',
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
                      position: 'relative',
                      
                      maxHeight: isActive ? 'none' : '110px',
                      transition: 'max-height 0.3s ease-out, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)';
                      setHoveredMessageId(chat.id);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                      setHoveredMessageId(null);
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0px'
                    }}>
                      <p style={{ margin: 0, color: '#555', fontSize: '0.9em' }}>
                        <strong style={{ color: chat.direction === 'incoming' ? '#DE1785' : '#000000' }}>
                          {chat.senderName}
                        </strong> ·{' '}
                        <span style={{ color: '#888' }}>
                          {formatDisplayDate(chat.timestamp)}
                        </span>
                      </p>
                      {/* Show direction tag only when not hovering */}
                      {hoveredMessageId !== chat.id && (
                        <div style={{
                          fontSize: '10px',
                          background: chat.direction === 'incoming' ? '#f3f4f6' : '#FDE7F1',
                          color: chat.direction === 'incoming' ? '#374151' : '#DE1785',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          textTransform: 'uppercase',
                          fontWeight: 'bold'
                        }}>
                          {chat.direction}
                        </div>
                      )}
                      
                    </div>
                    
                    {/* Show reply button when hovering and not active - positioned absolutely */}
                    {hoveredMessageId === chat.id && !isActive && selectedThreadId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMessageId(chat.id);
                          setIsReplying(true);
                        }}
                        style={{
                          background: '#FDE7F1', // Light pink background same as secondary tag
                          color: '#DE1785', // Beya pink for the icon
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fce7f3';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FDE7F1';
                        }}
                        title="Reply to this message"
                      >
                        <Reply size={16} />
                      </button>
                    )}
                    
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
                      fontSize: '14px',
                      wordWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      opacity: isActive ? 1 : 0.7,
                      transition: 'opacity 0.3s ease',
                      color: isActive ? '#333' : '#666'
                    }}>
                      {chat.htmlBody ? (
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chat.htmlBody) }} />
                      ) : (
                        renderBase64Content(chat)
                      )}
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
                          Reply
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
          background: '#FFFBFA',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16 
          }}>
            <h3 style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: '600' }}>Reply</h3>
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
            <>
              {/* WhatsApp Template Selector */}
              <WhatsAppTemplateSelector
                onTemplateSelect={handleTemplateSelect}
                isVisible={showTemplateSelector}
              />
              
              {/* Template Button */}
              <div style={{ marginBottom: '12px' }}>
                <button
                  onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                  style={{
                    background: showTemplateSelector ? '#f0f0f0' : '#FFFBFA',
                    color: showTemplateSelector ? '#DE1785' : '#666',
                    border: '1px solid #e0e0e0',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📱 {showTemplateSelector ? 'Hide Templates' : 'Use Template'}
                </button>
              </div>
              
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
                  background: '#FFFBFA',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, sans-serif'
                }}
              />
            </>
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

      {/* Resize Handle */}
      <div 
        style={{
          height: '8px',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent'
        }}
        onMouseDown={handleResizeStart}
      >
        <div style={{
          width: '40px',
          height: '3px',
          backgroundColor: isResizing ? '#de1785' : '#9ca3af',
          borderRadius: '2px',
          transition: isResizing ? 'none' : 'background-color 0.2s ease'
        }} />
      </div>

      <div style={{ 
        padding: 16, 
        backgroundColor: '#FBF7F7', // Match the thread list background
        height: `${discussionPanelHeight}px`,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Team Discussion Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          flexShrink: 0
        }}>
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
          flex: 1,
          overflowY: 'auto',
          marginBottom: 16,
          padding: '12px',
          background: 'transparent', // Remove white background 
          borderRadius: 8,
          border: 'none', // Remove border
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: '100px' // Ensure minimum height for messages
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
            alignItems: 'center',
            flexShrink: 0
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
            padding: '20px',
            flexShrink: 0
          }}>
            Select a conversation to start team discussion
          </div>
        )}
      </div>


    </div>
    </>
  );
};

export default MessageView; 