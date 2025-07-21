import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "../../../AuthContext";
import { EditorState, convertToRaw, Editor } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import EmailReplyEditor from '../SendBox';
import WhatsAppTemplateSelector from './WhatsAppTemplateSelector';
import { getUserById } from '../../../../services/userService';
import { discussionsService } from '../../../../services/discussionsService';
import { Reply } from 'lucide-react';
import './MessageView.css';

import { API_ENDPOINTS } from '../../../../config/api';
import DOMPurify from 'dompurify';

/**
 * Detect if a string is Base64 encoded
 */
const isBase64 = (str: string): boolean => {
  // Basic checks
  if (typeof str !== 'string' || str.length === 0) return false;
  if (str.length % 4 !== 0) return false;
  
  // Must be reasonably long to be a real Base64 attachment (at least 100 chars)
  if (str.length < 100) return false;
  
  // Should contain some variety of Base64 characters, not just letters
  const hasNumbers = /\d/.test(str);
  const hasSpecialChars = /[+/=]/.test(str);
  if (!hasNumbers && !hasSpecialChars) return false;
  
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
  From?: string | string[];
  To?: string | string[];
  CC?: string[];
  BCC?: string[];
  Direction: 'incoming' | 'outgoing';
  Timestamp: number;
  Channel?: 'whatsapp' | 'email';
  ThreadId?: string;
  mediaUrl?: string;
  mediaType?: string;
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

  /**
   * Clean email thread headers and quoted content - keep only the newest message
   */
  const cleanEmailThreadHeaders = (htmlContent: string): string => {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return htmlContent;
    }

    // Strategy: Find the first occurrence of a thread header and remove everything after it
    // This keeps only the newest content (before the first "On ... wrote:" section)
    
    const threadHeaderPatterns = [
      // HTML encoded emails with &lt; and &gt;
      /On\s+[^,]+,\s+[^,]+\s+at\s+[^&]+&lt;[^&]+&gt;\s+wrote:/gi,
      
      // Regular emails with < and >
      /On\s+[^,]+,\s+[^,]+\s+at\s+[^<]+<[^>]+>\s+wrote:/gi,
      
      // More specific pattern for the format we're seeing
      /On\s+\w+,\s+\w+\s+\d+,\s+\d+\s+at\s+\d+:\d+\s+[AP]M\s+[^&<]*(?:&lt;|<)[^&>]*(?:&gt;|>)\s+wrote:/gi,
      
      // General pattern - any "On ... wrote:"
      /On\s+.+?\s+wrote:/gi,
    ];

    let cleanedContent = htmlContent;
    
    // Find the first thread header and cut everything after it
    for (let i = 0; i < threadHeaderPatterns.length; i++) {
      const pattern = threadHeaderPatterns[i];
      const match = pattern.exec(cleanedContent);
      
      if (match) {
        // Cut everything from the thread header onwards
        cleanedContent = cleanedContent.substring(0, match.index).trim();
        break; // Stop after first match
      }
    }

    // Additional cleanup for any remaining threading artifacts
    const cleanupPatterns = [
      // Remove any remaining "wrote:" fragments
      /\s+wrote:\s*/gi,
      
      // Remove HTML encoded versions of quotes
      /&gt;\s*/gi,
      
      // Remove HTML wrapped versions
      /<[^>]*>On\s+[^,]+,\s+[^,]+\s+at\s+[^<]+<[^>]+>\s+wrote:\s*<[^>]*>/gi,
    ];

    cleanupPatterns.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '');
    });

    // Clean up any extra whitespace
    cleanedContent = cleanedContent.replace(/^\s+/gm, '').replace(/\s+$/gm, '').trim();
    
    return cleanedContent;
  };

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
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const [replyBcc, setReplyBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [teamChatInput, setTeamChatInput] = useState('');
  const [emailEditorState, setEmailEditorState] = useState<EditorState>(
    () => EditorState.createEmpty()
  );
  
  // Mock tonality analysis feature
  const [showTonalityWarning, setShowTonalityWarning] = useState(false);
  const [isReplySending, setIsReplySending] = useState(false);

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

  // Undo send feature
  const [pendingSendMessageId, setPendingSendMessageId] = useState<string | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const [pendingSendTimeout, setPendingSendTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pendingSendInterval, setPendingSendInterval] = useState<NodeJS.Timeout | null>(null);
  const [tempMessage, setTempMessage] = useState<any | null>(null);

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

  // Effect to automatically expand the last message when thread is opened
  useEffect(() => {
    if (selectedThreadId && messages.length > 0) {
      // Find the last message (most recent by timestamp)
      const sortedMessages = [...messages].sort((a, b) => {
        const timestampA = a.Timestamp || 0;
        const timestampB = b.Timestamp || 0;
        return timestampB - timestampA; // Most recent first
      });
      
      const lastMessage = sortedMessages[0];
      if (lastMessage && lastMessage.MessageId) {
        setActiveMessageId(lastMessage.MessageId);
      }
    } else {
      // Clear active message when no thread selected
      setActiveMessageId(null);
    }
  }, [selectedThreadId, messages]);

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

  // Cleanup pending sends on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pendingSendTimeout) {
        clearTimeout(pendingSendTimeout);
      }
      if (pendingSendInterval) {
        clearInterval(pendingSendInterval);
      }
    };
  }, [pendingSendTimeout, pendingSendInterval]);

  const loadTeamMessages = async (threadId: string) => {
    try {
      console.log('Loading team messages for thread:', threadId);
      
      // Check if FLOW_COMMENTS endpoint is configured
      if (!API_ENDPOINTS.FLOW_COMMENTS) {
        console.log('Flow comments endpoint not configured, skipping team messages load');
        setTeamMessages([]);
        return;
      }
      
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
    // Clean email thread headers from plain text as well
    const cleanedText = cleanEmailThreadHeaders(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    return cleanedText.split(urlRegex).map((part, index) => {
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

  // Undo send functions
  const handleUndoSend = () => {
    if (pendingSendMessageId) {
      // Clear the timeout and interval
      if (pendingSendTimeout) {
        clearTimeout(pendingSendTimeout);
      }
      if (pendingSendInterval) {
        clearInterval(pendingSendInterval);
      }
      
      // Reset states
      setPendingSendMessageId(null);
      setUndoCountdown(0);
      setIsReplySending(false);
      setPendingSendTimeout(null);
      setPendingSendInterval(null);
      setTempMessage(null);
      
      console.log('📧 Email send cancelled by user');
    }
  };

  const executeDelayedSend = async (messageData: any) => {
    try {
      console.log('📧 Executing delayed send:', messageData);
      await onSendMessage?.(messageData);
      
      // Clear reply form on successful send (already done in handleReplySend)
      // Clear temporary message
      setTempMessage(null);
      
    } catch (err) {
      console.error('Error in delayed send:', err);
      // On error, allow user to retry - restore the reply interface
      setIsReplying(true);
      setIsReplySending(false);
    } finally {
      // Clean up pending send state
      setPendingSendMessageId(null);
      setUndoCountdown(0);
      setPendingSendTimeout(null);
      setPendingSendInterval(null);
    }
  };

  // COMMENTED OUT - Original send reply functionality
  const handleReplySend = async () => {
    if (!selectedThreadId) return;

    setIsReplySending(true);
    
    try {
      const channel = getChannel(selectedThreadId);
      let messageData: any;
      
      if (channel === 'email') {
        // Validate editor state before conversion
        if (!emailEditorState || !emailEditorState.getCurrentContent()) {
          console.error('❌ Invalid editor state');
          throw new Error('Editor state is invalid');
        }
        
        let htmlContent: string;
        let plainText: string;
        
        try {
          const currentContent = emailEditorState.getCurrentContent();
          const rawContentState = convertToRaw(currentContent);
          htmlContent = draftToHtml(rawContentState);
          plainText = currentContent.getPlainText();
        } catch (draftError) {
          console.error('❌ Draft.js conversion error:', draftError);
          // Fallback: use plain text from editor if available
          plainText = emailEditorState.getCurrentContent()?.getPlainText() || '';
          if (!plainText.trim()) {
            throw new Error('No content to send');
          }
          htmlContent = `<p>${plainText}</p>`;
        }
        
        // Use the replyTo field that was auto-populated (fallback to flow contact if empty)
        let recipient = replyTo || flow?.contactEmail || flow?.contactIdentifier || flow?.fromEmail || decodeURIComponent(selectedThreadId);
        
        // IMPORTANT: Extract actual email address from flowId if needed
        if (selectedThreadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          // If selectedThreadId is a UUID (flowId), look up the actual email address
          if (replyTo || flow?.contactIdentifier || flow?.contactEmail || flow?.fromEmail) {
            recipient = replyTo || flow.contactIdentifier || flow.contactEmail || flow.fromEmail;
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
        
        console.log('📧 Preparing email for delayed send:', {
          recipient,
          subject: finalSubject,
          hasLatestIncoming: !!latestIncoming,
          note: 'Will send after undo countdown'
        });
        
        // Parse CC and BCC fields into arrays
        const ccArray = replyCc.trim() ? replyCc.split(',').map(email => email.trim()).filter(Boolean) : [];
        const bccArray = replyBcc.trim() ? replyBcc.split(',').map(email => email.trim()).filter(Boolean) : [];
        
        // Find the Gmail Message-ID from the message being replied to for proper threading
        let originalMessageId: string | undefined = undefined;
        if (latestIncoming && latestIncoming.GmailMessageId) {
          originalMessageId = latestIncoming.GmailMessageId;
          console.log('📧 Found Gmail Message-ID for threading:', originalMessageId);
        } else if (latestIncoming && latestIncoming.MessageId) {
          originalMessageId = latestIncoming.MessageId;
          console.log('📧 Using fallback Message-ID for threading:', originalMessageId);
        } else {
          console.log('📧 No Message-ID found for threading - backend will search automatically');
        }
        
        // Generate unique message ID for temporary message
        const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        messageData = {
          channel: 'email',
          to: recipient,
          cc: ccArray,
          bcc: bccArray,
          subject: finalSubject || 'Re: (no subject)',
          content: plainText,
          html: htmlContent,
          originalMessageId: originalMessageId,
          MessageId: tempMessageId
        };

        // Create temporary message for immediate UI display
        const tempMsg = {
          MessageId: tempMessageId,
          Subject: finalSubject || 'Re: (no subject)',
          body: plainText,
          htmlBody: htmlContent,
          from: user?.subscriber_email || 'me',
          to: [recipient],
          cc: ccArray,
          bcc: bccArray,
          Direction: 'outgoing',
          Timestamp: Date.now() / 1000,
          isPending: true
        };
        setTempMessage(tempMsg);
      } else {
        // For WhatsApp
        const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        messageData = {
          channel: 'whatsapp',
          to: selectedThreadId,
          content: replyText,
          MessageId: tempMessageId
        };

        // Create temporary message for immediate UI display
        const tempMsg = {
          MessageId: tempMessageId,
          body: replyText,
          from: user?.subscriber_email || 'me',
          to: [selectedThreadId],
          Direction: 'outgoing',
          Timestamp: Date.now() / 1000,
          isPending: true
        };
        setTempMessage(tempMsg);
      }
      
      // Start undo countdown (15 seconds)
      const UNDO_DELAY = 15; // seconds
      setUndoCountdown(UNDO_DELAY);
      
      // Create countdown interval
      const intervalId = setInterval(() => {
        setUndoCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Create timeout for actual send
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        executeDelayedSend(messageData);
      }, UNDO_DELAY * 1000);
      
      // Store pending send data
      setPendingSendMessageId(messageData.MessageId);
      setPendingSendTimeout(timeoutId);
      setPendingSendInterval(intervalId);
      
      // Close reply interface immediately
      setIsReplying(false);
      setEmailEditorState(EditorState.createEmpty());
      setReplySubject('');
      setReplyTo('');
      setReplyCc('');
      setReplyBcc('');
      setShowCcBcc(false);
      setReplyingToMessageId(null);
      setReplyText('');
      
      console.log('📧 Email queued for sending - undo available for', UNDO_DELAY, 'seconds');
      
    } catch (err) {
      console.error('Error preparing reply:', err);
      setIsReplySending(false);
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
    // Enhanced HTML content detection
    const isHtmlContent = msg.Body && (
      msg.Body.includes('<!DOCTYPE') || 
      msg.Body.includes('<html') || 
      msg.Body.includes('<div') || 
      msg.Body.includes('<p>') ||
      msg.Body.includes('<table') ||
      msg.Body.includes('<style') ||
      msg.Body.includes('<br') ||
      msg.Body.includes('<span') ||
      msg.Body.includes('<td') ||
      msg.Body.includes('<tr') ||
      msg.Body.includes('<th') ||
      msg.Body.includes('<thead') ||
      msg.Body.includes('<tbody') ||
      msg.Body.includes('<strong') ||
      msg.Body.includes('<em') ||
      msg.Body.includes('<b>') ||
      msg.Body.includes('<i>') ||
      msg.Body.includes('<a ') ||
      msg.Body.includes('<img') ||
      // Also check if there's a separate HtmlBody field
      !!msg.HtmlBody
    );

    // Process message body for Base64 detection
    const rawBody = msg.Body || msg.Text || '';
    const processedMessage = processMessageBody(rawBody);

    return {
      id: msg.MessageId || `${msg.Timestamp || Date.now()}`,
      body: isHtmlContent ? (msg.Snippet || 'HTML Email') : processedMessage.body,
      htmlBody: isHtmlContent ? (msg.HtmlBody || msg.Body) : '',
      direction: msg.Direction || 'incoming',
      timestamp: formatTimestamp(msg.Timestamp),
      channel: msg.Channel || 'email',
      threadId: msg.ThreadId || '',
      senderName: msg.Direction === 'incoming' ? getContactName() : 'You',
      subject: msg.Subject || '',
      text: isHtmlContent ? (msg.Snippet || 'HTML Email') : processedMessage.body,
      sender: msg.FromAddress,
      recipient: msg.ToAddress,
      // Email participant information
      from: Array.isArray(msg.From) ? msg.From[0] : msg.From,
      to: Array.isArray(msg.To) ? msg.To : (msg.To ? [msg.To] : []),
      cc: msg.CC || [],
      bcc: msg.BCC || [],
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
      setShowCcBcc(false);
      setReplyingToMessageId(null);
      
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

    // Hide scrollbar after 3000ms of no scrolling (increased for more forgiving UX)
    messageScrollTimeoutRef.current = setTimeout(() => {
      container.classList.remove('scrolling');
    }, 3000);
  };

  // Handle mouse enter on scroll container
  const handleMessageMouseEnter = () => {
    const container = messageScrollContainerRef.current;
    if (!container) return;
    container.classList.add('scrolling');
    
    // Clear any existing timeout when hovering
    if (messageScrollTimeoutRef.current) {
      clearTimeout(messageScrollTimeoutRef.current);
    }
  };

  // Handle mouse move to keep scrollbar visible during interaction
  const handleMessageMouseMove = () => {
    const container = messageScrollContainerRef.current;
    if (!container) return;
    container.classList.add('scrolling');
    
    // Clear any existing timeout when moving mouse
    if (messageScrollTimeoutRef.current) {
      clearTimeout(messageScrollTimeoutRef.current);
    }
  };

  // Handle mouse leave on scroll container
  const handleMessageMouseLeave = () => {
    const container = messageScrollContainerRef.current;
    if (!container) return;

    // Only hide if not actively scrolling - longer delay for easier scrollbar interaction
    messageScrollTimeoutRef.current = setTimeout(() => {
      container.classList.remove('scrolling');
    }, 2000);
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
          width: 6px;
        }
        .message-custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .message-custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(222, 23, 133, 0.4);
          border-radius: 3px;
          min-height: 40px;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.2s ease;
        }
        .message-custom-scrollbar:hover::-webkit-scrollbar-thumb,
        .message-custom-scrollbar.scrolling::-webkit-scrollbar-thumb {
          opacity: 1;
        }
        .message-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(222, 23, 133, 0.8);
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
        
        @keyframes borderProgress {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: 1000;
          }
        }
        
        @keyframes shrinkHorizontal {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        
        @keyframes shrinkVertical {
          from {
            transform: scaleY(1);
          }
          to {
            transform: scaleY(0);
          }
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
              padding: '14px 16px 0 16px', // Add top padding for spacing from status bar
              gap: '8px',
              position: 'sticky',
              top: 0,
              backgroundColor: 'transparent',
              zIndex: 10,
              marginBottom: '3px'
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
                    
                    // Color mapping for different secondary tags
                    const getTagColors = (tagName: string) => {
                      const tagColors: Record<string, { bg: string; color: string; border: string }> = {
                        'urgent': { bg: '#FEF2F2', color: '#DC2626', border: '#DC2626' }, // Red
                        'vip': { bg: '#F3E8FF', color: '#7C3AED', border: '#7C3AED' }, // Purple
                        'complex': { bg: '#FEF3C7', color: '#D97706', border: '#D97706' }, // Amber
                        'enterprise': { bg: '#ECFDF5', color: '#059669', border: '#059669' }, // Green
                        'follow-up': { bg: '#EFF6FF', color: '#2563EB', border: '#2563EB' }, // Blue
                        'escalated': { bg: '#FEF2F2', color: '#DC2626', border: '#DC2626' }, // Red
                        'deleted': { bg: '#F3F4F6', color: '#6B7280', border: '#6B7280' }, // Gray
                      };
                      return tagColors[tagName.toLowerCase()] || { bg: '#FDE7F1', color: '#DE1785', border: '#DE1785' }; // Default pink
                    };
                    
                    return secondaryTags.slice(0, 2).map((tag: string, index: number) => {
                      const colors = getTagColors(tag);
                      
                      return (
                      <span
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSecondaryTagSelect(tag);
                        }}
                        style={{
                            background: colors.bg,
                            color: colors.color,
                            border: `1px solid ${colors.border}`,
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
                      );
                    });
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
              onMouseEnter={handleMessageMouseEnter}
              onMouseMove={handleMessageMouseMove}
              onMouseLeave={handleMessageMouseLeave}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingTop: '16px'
              }}
              className="message-custom-scrollbar"
            >
              {(() => {
                // Combine normalized messages with temporary message if it exists
                const allMessages = [...normalizedMessages];
                if (tempMessage) {
                  allMessages.push({
                    id: tempMessage.MessageId,
                    subject: tempMessage.Subject || '',
                    body: tempMessage.body || '',
                    htmlBody: tempMessage.htmlBody || '',
                    from: tempMessage.from,
                    to: tempMessage.to,
                    cc: tempMessage.cc || [],
                    bcc: tempMessage.bcc || [],
                    direction: tempMessage.Direction,
                    timestamp: tempMessage.Timestamp,
                    attachments: []
                  } as any);
                }
                
                return allMessages.map(chat => {
                  const isActive = chat.id === activeMessageId;
                  const isPendingMessage = chat.id === pendingSendMessageId;

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
                        border: isPendingMessage ? '3px solid #DE1785' : '1px solid #f0f0f0',
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
                      {/* Animated border overlay for pending messages */}
                      {isPendingMessage && (
                        <>
                          {/* Top border */}
                          <div style={{
                            position: 'absolute',
                            top: -3,
                            left: -3,
                            right: -3,
                            height: 3,
                            background: '#DE1785',
                            transformOrigin: 'left',
                            animation: `shrinkHorizontal 15s linear forwards`
                          }} />
                          {/* Right border */}
                          <div style={{
                            position: 'absolute',
                            top: -3,
                            right: -3,
                            bottom: -3,
                            width: 3,
                            background: '#DE1785',
                            transformOrigin: 'top',
                            animation: `shrinkVertical 15s linear forwards`,
                            animationDelay: `3.75s`
                          }} />
                          {/* Bottom border */}
                          <div style={{
                            position: 'absolute',
                            bottom: -3,
                            left: -3,
                            right: -3,
                            height: 3,
                            background: '#DE1785',
                            transformOrigin: 'right',
                            animation: `shrinkHorizontal 15s linear forwards`,
                            animationDelay: `7.5s`
                          }} />
                          {/* Left border */}
                          <div style={{
                            position: 'absolute',
                            top: -3,
                            left: -3,
                            bottom: -3,
                            width: 3,
                            background: '#DE1785',
                            transformOrigin: 'bottom',
                            animation: `shrinkVertical 15s linear forwards`,
                            animationDelay: `11.25s`
                          }} />
                        </>
                      )}
                      
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
                            {isPendingMessage ? `Sending in ${undoCountdown}s` : chat.direction}
                          </div>
                        )}
                        
                      </div>
                      
                      {/* Show reply button when hovering and not active - positioned absolutely */}
                      {hoveredMessageId === chat.id && !isActive && selectedThreadId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            // If this is a pending message, handle undo
                            if (isPendingMessage) {
                              handleUndoSend();
                              return;
                            }
                            
                            // Otherwise, handle normal reply
                            setActiveMessageId(chat.id);
                            setIsReplying(true);
                            setReplyingToMessageId(chat.id);
                            
                            console.log('🔍 Debug reply auto-fill:', {
                              chatDirection: chat.direction,
                              chatFrom: chat.from,
                              chatTo: chat.to,
                              chatCc: chat.cc,
                              flowParticipants: flow?.participants,
                              userEmail: user?.subscriber_email
                            });
                            
                            // Auto-populate reply fields based on message participants
                            let replyToEmail = '';
                            let replyCcEmails: string[] = [];
                            
                            if (chat.direction === 'incoming') {
                              // Replying to incoming message: Reply to sender, CC others if any
                              replyToEmail = chat.from || '';
                              
                              // For incoming messages, check if there were CC recipients
                              if (chat.cc && chat.cc.length > 0) {
                                replyCcEmails = chat.cc.filter((email: string) => email !== user?.subscriber_email);
                              }
                            } else {
                              // Replying to outgoing message: Reply to original recipients
                              if (chat.to && chat.to.length > 0) {
                                // Primary recipient is first in To field
                                replyToEmail = chat.to[0] || '';
                                
                                // CC includes remaining To recipients + original CC (excluding self)
                                const remainingTo = chat.to.slice(1);
                                const originalCc = chat.cc || [];
                                replyCcEmails = [...remainingTo, ...originalCc].filter((email: string) => email !== user?.subscriber_email);
                              }
                            }
                            
                            // Fallback to flow participants if message doesn't have participant info
                            if (!replyToEmail && flow && flow.participants && Array.isArray(flow.participants)) {
                              const otherParticipants = flow.participants.filter((p: string) => p !== user?.subscriber_email);
                              if (otherParticipants.length > 0) {
                                replyToEmail = otherParticipants[0];
                                replyCcEmails = otherParticipants.slice(1);
                              }
                            }
                            
                            // Final fallback to flow contact info
                            if (!replyToEmail) {
                              replyToEmail = flow?.contactIdentifier || flow?.contactEmail || flow?.fromEmail || '';
                            }
                            
                            setReplyTo(replyToEmail);
                            setReplyCc(replyCcEmails.join(', '));
                            
                            console.log('✅ Reply fields populated:', {
                              replyTo: replyToEmail,
                              replyCc: replyCcEmails.join(', ')
                            });
                            
                            // Auto-populate subject
                            let subjectToUse = chat.subject || flow?.subject || '';
                            if (subjectToUse) {
                              const replySubj = subjectToUse.startsWith('Re:') ? subjectToUse : `Re: ${subjectToUse}`;
                              setReplySubject(replySubj);
                            } else {
                              setReplySubject('Re: (no subject)');
                            }
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
                          title={isPendingMessage ? "Undo send" : "Reply to this message"}
                        >
                          {isPendingMessage ? (
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>↺</span>
                          ) : (
                            <Reply size={16} />
                          )}
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

                      {/* Participant info removed - now shown in thread title */}
                      
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
                            <div 
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanEmailThreadHeaders(chat.htmlBody)) }}
                              className="email-html-content"
                            />
                          ) : (
                            renderBase64Content(chat)
                          )}
                      </div>

                      {/* Display attachments if any */}
                      {chat.attachments && chat.attachments.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          padding: '8px',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          fontSize: '0.9em'
                        }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#555' }}>
                            📎 Attachments ({chat.attachments.length})
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {chat.attachments.map((attachment: any, index: number) => {
                              // Debug logging to see attachment structure
                              console.log('🔍 Attachment debug:', {
                                attachment,
                                hasUrl: !!(attachment.url || attachment.Url),
                                url: attachment.url || attachment.Url,
                                urlStartsWithGmail: (attachment.url || attachment.Url)?.startsWith('gmail-attachment://'),
                                attachmentId: attachment.id || attachment.Id,
                                attachmentName: attachment.name || attachment.Name
                              });
                              
                              return (
                              <div
                                key={attachment.id || index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '4px 8px',
                                  background: '#fff',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                <span style={{ flex: 1, color: '#333' }}>
                                  {attachment.name || attachment.Name || 'Unnamed file'}
                                </span>
                                <span style={{ color: '#888', fontSize: '0.85em' }}>
                                  {attachment.sizeBytes || attachment.SizeBytes 
                                    ? `${Math.round((attachment.sizeBytes || attachment.SizeBytes) / 1024)}KB`
                                    : 'Size unknown'}
                                </span>
                                {(attachment.url || attachment.Url) && !(attachment.url || attachment.Url).startsWith('gmail-attachment://') && (
                                  <a
                                    href={attachment.url || attachment.Url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: '#DE1785',
                                      textDecoration: 'none',
                                      fontSize: '0.85em'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Download
                                  </a>
                                )}
                                {(attachment.url || attachment.Url) && (attachment.url || attachment.Url).startsWith('gmail-attachment://') && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const userId = user?.userId;
                                        const messageId = chat.gmailMessageId || chat.messageId;
                                        const attachmentId = attachment.id || attachment.Id;
                                        
                                        if (!userId || !messageId || !attachmentId) {
                                          throw new Error('Missing required information for download');
                                        }
                                        
                                        // Call attachment download API
                                        const downloadUrl = `${API_ENDPOINTS.ATTACHMENT_DOWNLOAD}/${userId}/${messageId}/${attachmentId}`;
                                        const response = await fetch(downloadUrl);
                                        
                                        if (!response.ok) {
                                          throw new Error('Failed to download attachment');
                                        }
                                        
                                        // Create blob and download
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = attachment.name || attachment.Name || 'attachment';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                      } catch (error) {
                                        console.error('Error downloading attachment:', error);
                                        alert('Failed to download attachment');
                                      }
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#DE1785',
                                      textDecoration: 'underline',
                                      fontSize: '0.85em',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Download
                                  </button>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
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
                              
                              // Add the same autofill logic as the hover reply button
                              if (!isReplying) {
                                setReplyingToMessageId(chat.id);
                                console.log('🔍 Debug reply auto-fill (bottom button):', {
                                  chatDirection: chat.direction,
                                  chatFrom: chat.from,
                                  chatTo: chat.to,
                                  chatCc: chat.cc,
                                  flowParticipants: flow?.participants,
                                  userEmail: user?.subscriber_email
                                });
                                
                                // Auto-populate reply fields based on message participants
                                let replyToEmail = '';
                                let replyCcEmails: string[] = [];
                                
                                if (chat.direction === 'incoming') {
                                  // Replying to incoming message: Reply to sender, CC others if any
                                  replyToEmail = chat.from || '';
                                  
                                  // For incoming messages, check if there were CC recipients
                                  if (chat.cc && chat.cc.length > 0) {
                                    replyCcEmails = chat.cc.filter((email: string) => email !== user?.subscriber_email);
                                  }
                                } else {
                                  // Replying to outgoing message: Reply to original recipients
                                  if (chat.to && chat.to.length > 0) {
                                    // Primary recipient is first in To field
                                    replyToEmail = chat.to[0] || '';
                                    
                                    // CC includes remaining To recipients + original CC (excluding self)
                                    const remainingTo = chat.to.slice(1);
                                    const originalCc = chat.cc || [];
                                    replyCcEmails = [...remainingTo, ...originalCc].filter((email: string) => email !== user?.subscriber_email);
                                  }
                                }
                                
                                // Fallback to flow participants if message doesn't have participant info
                                if (!replyToEmail && flow && flow.participants && Array.isArray(flow.participants)) {
                                  const otherParticipants = flow.participants.filter((p: string) => p !== user?.subscriber_email);
                                  if (otherParticipants.length > 0) {
                                    replyToEmail = otherParticipants[0];
                                    replyCcEmails = otherParticipants.slice(1);
                                  }
                                }
                                
                                // Final fallback to flow contact info
                                if (!replyToEmail) {
                                  replyToEmail = flow?.contactIdentifier || flow?.contactEmail || flow?.fromEmail || '';
                                }
                                
                                setReplyTo(replyToEmail);
                                setReplyCc(replyCcEmails.join(', '));
                                
                                console.log('✅ Reply fields populated (bottom button):', {
                                  replyTo: replyToEmail,
                                  replyCc: replyCcEmails.join(', ')
                                });
                                
                                // Auto-populate subject
                                let subjectToUse = chat.subject || flow?.subject || '';
                                if (subjectToUse) {
                                  const replySubj = subjectToUse.startsWith('Re:') ? subjectToUse : `Re: ${subjectToUse}`;
                                  setReplySubject(replySubj);
                                } else {
                                  setReplySubject('Re: (no subject)');
                                }
                              }
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
                });
              })()}
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
                setReplyBcc(''); // Reset BCC field
                setShowCcBcc(false); // Reset CC/BCC visibility
                setReplyingToMessageId(null); // Reset replying to message
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
              {/* To Field */}
              <input
                type="text"
                value={replyTo}
                onChange={e => setReplyTo(e.target.value)}
                placeholder="To"
                style={{
                  width: '100%',
                  marginBottom: 8,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />
              
              {/* Subject Field */}
              <input
                type="text"
                value={replySubject}
                onChange={e => setReplySubject(e.target.value)}
                placeholder="Subject"
                style={{
                  width: '100%',
                  marginBottom: 8,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  boxSizing: 'border-box',
                  fontSize: '14px'
                }}
              />

              {/* CC/BCC Toggle Button */}
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '4px 0',
                  marginBottom: showCcBcc ? 8 : 16,
                  textDecoration: 'underline'
                }}
              >
                {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
              </button>

              {/* CC/BCC Fields (conditional) */}
              {showCcBcc && (
                <>
                  <input
                    type="text"
                    value={replyCc}
                    onChange={e => setReplyCc(e.target.value)}
                    placeholder="CC"
                    style={{
                      width: '100%',
                      marginBottom: 8,
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      boxSizing: 'border-box',
                      fontSize: '14px'
                    }}
                  />
                  
                  <input
                    type="text"
                    value={replyBcc}
                    onChange={e => setReplyBcc(e.target.value)}
                    placeholder="BCC"
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
                </>
              )}

              {/* Original Message Reference (when replying) */}
              {isReplying && (() => {
                const originalMessage = normalizedMessages.find(msg => msg.id === replyingToMessageId);
                if (!originalMessage) return null;
                
                return (
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#374151',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    marginBottom: '16px'
                  }}>
                    {originalMessage.htmlBody ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(cleanEmailThreadHeaders(originalMessage.htmlBody)) 
                      }} />
                    ) : (
                      <div>{cleanEmailThreadHeaders(originalMessage.body || 'No content')}</div>
                    )}
                  </div>
                );
              })()}
              
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
                setReplyBcc(''); // Reset BCC field
                setShowCcBcc(false); // Reset CC/BCC visibility
                setReplyingToMessageId(null); // Reset replying to message
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
              disabled={isReplySending}
              style={{
                background: isReplySending ? '#9ca3af' : '#DE1785',
                color: '#fff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: 8,
                fontSize: '14px',
                cursor: isReplySending ? 'not-allowed' : 'pointer',
                boxShadow: isReplySending ? 'none' : '0 2px 5px rgba(222,23,133,0.3)',
                fontWeight: '600',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!isReplySending) {
                  e.currentTarget.style.background = '#c1166a';
                }
              }}
              onMouseLeave={(e) => {
                if (!isReplySending) {
                  e.currentTarget.style.background = '#DE1785';
                }
              }}
            >
              {isReplySending ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Sending...
                </>
              ) : (
                'Send Reply'
              )}
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

      {/* CSS for loading spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

    </div>
    </>
  );
};

export default MessageView; 