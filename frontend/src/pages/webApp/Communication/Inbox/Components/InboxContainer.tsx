import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from "../../../../AuthContext";
import ThreadList from './ThreadList';
import MessageView from './MessageView';
import ComposeModal from './ComposeModal';
import LoadingScreen from '../../../components/LoadingScreen';
import { discussionsService } from '../../../../../discussionsService';
import { getUserById } from '../../../../../userService';
import { Users, Plus } from 'lucide-react';
import config, { API_ENDPOINTS } from '../../../../../config/api';

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
  const [showReminderModal, setShowReminderModal] = useState(false);

  // View state for switching between Inbox and Discussions
  const [currentView, setCurrentView] = useState<'inbox' | 'discussions'>('inbox');
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [discussionMessages, setDiscussionMessages] = useState<any[]>([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);

  // Participants state
  const [participantNames, setParticipantNames] = useState<{[userId: string]: string}>({});
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'waiting' | 'resolved' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Department dropdown state
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const departmentDropdownRef = useRef<HTMLDivElement>(null);
  
  // New filter for discussions
  const [viewFilter, setViewFilter] = useState<'all' | 'shared-with-me' | 'shared-by-me' | 'deleted'>('all');

  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [isCheckingMessages, setIsCheckingMessages] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);

  // API Base URL
  const apiBase = API_ENDPOINTS.INBOX_API_BASE;
  
  // Department options
  const primaryTagOptions = ['sales', 'logistics', 'support'];

  // Current flow
  const currentFlow = useMemo(() => {
    return Array.isArray(flows) ? flows.find(f => f.flowId === selectedThreadId) : undefined;
  }, [flows, selectedThreadId]);

  // Load data on mount
  useEffect(() => {
    loadInboxData(false);
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

  const loadInboxData = async (fromPolling = false) => {
    try {
      if (!fromPolling) {
        setLoading(true);
        setError(null);
      }

      // Load flows
      const flowsResponse = await fetch(`${apiBase}/flows`);
      if (!flowsResponse.ok) throw new Error('Failed to load conversations');
      
      const flowsData = await flowsResponse.json();
      if (!fromPolling) {
        console.log('Loaded flows:', flowsData);
      }
      
      const flowsArray = flowsData.flows || [];
      
      // Debug: Check for duplicate flowIds in the API response (only log when not polling)
      if (!fromPolling) {
        const flowIds = flowsArray.map((f: any) => f.flowId);
        const duplicateIds = flowIds.filter((id: string, index: number) => flowIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('⚠️ Duplicate flow IDs found in API response:', duplicateIds);
          console.warn('⚠️ This indicates contact identifiers (email/phone) are being used as flowId instead of unique UUIDs');
          console.warn('⚠️ This should be resolved after updating the flow creation logic to use unique flowIds');
        }
      }
      
      // Load thread list with unread counts
      const threadsResponse = await fetch(`${apiBase}/webhook/threads?userId=${encodeURIComponent(user!.userId)}`);
      if (!threadsResponse.ok) throw new Error('Failed to load thread list');
      
      const threadsData = await threadsResponse.json();
      const threadsList: string[] = threadsData.threads || [];
      
      // Update flows with unread counts from the API response
      let updatedFlows = flowsArray;
      if (threadsData.unreadCounts && Array.isArray(threadsData.unreadCounts)) {
        console.log('🔴 Updating flows with unread counts:', threadsData.unreadCounts);
        
        updatedFlows = flowsArray.map((flow: any) => {
          const unreadInfo = threadsData.unreadCounts.find((u: any) => u.threadId === flow.flowId);
          if (unreadInfo) {
            return {
              ...flow,
              unreadCount: unreadInfo.unreadCount,
              hasUnreadMessages: unreadInfo.hasUnreadMessages
            };
          }
          return {
            ...flow,
            unreadCount: 0,
            hasUnreadMessages: false
          };
        });
      }
      
      setFlows(updatedFlows);
      // Use flow IDs from the flows response instead of the threads endpoint
      // This ensures all flows are shown, not just those with messages in the GSI
      const flowIds: string[] = updatedFlows.map((f: any) => f.flowId);
      setThreads(flowIds);
      
      // Preload last messages for all flows for better preview
      if (!fromPolling && updatedFlows.length > 0) {
        console.log('🔄 Preloading last messages for all flows...');
        
        // Process flows in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < updatedFlows.length; i += batchSize) {
          const batch = updatedFlows.slice(i, i + batchSize);
          
          // Process batch in parallel
          const batchPromises = batch.map(async (flow: any) => {
            try {
              const response = await fetch(`${apiBase}/webhook/threads/${encodeURIComponent(flow.flowId)}?userId=${encodeURIComponent(user!.userId)}`);
              if (response.ok) {
                const data = await response.json();
                const messagesArray = data.messages || [];
                
                if (messagesArray.length > 0) {
                  // Sort messages by timestamp to get the true last message
                  const sortedMessages = [...messagesArray].sort((a, b) => {
                    const timestampA = a.Timestamp || a.timestamp || 0;
                    const timestampB = b.Timestamp || b.timestamp || 0;
                    return timestampB - timestampA; // Most recent first
                  });
                  
                  const lastMessage = sortedMessages[0];
                  let messageContent = lastMessage.Body || lastMessage.Text || lastMessage.body || lastMessage.text || '';
                  
                  // For email messages, prefer subject if body is empty or too long
                  if (lastMessage.Channel === 'email' || lastMessage.channel === 'email') {
                    const subject = lastMessage.Subject || lastMessage.subject || '';
                    if (subject && (!messageContent || messageContent.length > 100)) {
                      messageContent = subject;
                    } else if (messageContent.length > 100) {
                      messageContent = messageContent.substring(0, 100) + '...';
                    }
                  }
                  
                  // Add direction indicator for clarity
                  if (messageContent.trim()) {
                    const direction = lastMessage.Direction || lastMessage.direction || 'unknown';
                    const indicator = direction === 'outgoing' ? '➤ ' : '← ';
                    const finalContent = `${indicator}${messageContent.trim()}`;
                    
                    return { flowId: flow.flowId, lastMessage: finalContent };
                  }
                }
              }
            } catch (err) {
              // Silent fail for preloading
            }
            return null;
          });
          
          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises);
          
          // Update flows with the results
          const validResults = batchResults.filter(result => result !== null);
          if (validResults.length > 0) {
            setFlows(prevFlows => 
              prevFlows.map(flow => {
                const result = validResults.find(r => r.flowId === flow.flowId);
                return result ? { ...flow, lastMessage: result.lastMessage } : flow;
              })
            );
          }
          
          // Small delay between batches to be respectful to the API
          if (i + batchSize < updatedFlows.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log('✅ Finished preloading last messages');
      }
      
      // Load discussions using the existing function
      if (!fromPolling) {
        await loadDiscussions(true);
      }
      
    } catch (err) {
      console.error('Error loading inbox data:', err);
      if (!fromPolling) {
        setError('Failed to load conversations');
      }
    } finally {
      if (!fromPolling) {
        setLoading(false);
      }
    }
  };

  const loadDiscussions = async (fromPolling = false) => {
    if (!user?.userId) return;
    
    try {
      if (!fromPolling) {
        setDiscussionsLoading(true);
        setError(null);
      }
      
      const apiDiscussions = await discussionsService.listDiscussions(user.userId);
      if (!fromPolling) {
        console.log('🔍 Raw API discussions before transformation:', apiDiscussions);
      }
      
      // Transform discussions to match the expected format for ThreadList
      const transformedDiscussions = apiDiscussions.map(discussion => {
        if (!fromPolling) {
          console.log(`🔍 Processing discussion "${discussion.title}":`, {
            originalStatus: discussion.status,
            originalPrimaryTag: discussion.primaryTag,
            originalSecondaryTags: discussion.secondaryTags
          });
        }
        
        const participantNames = discussion.participants.map(id => 
          id === user.userId ? (user.displayName || 'You') : `User ${id.slice(-4)}`
        );
        
        const finalStatus = discussion.status || 'open'; // Default to 'open' if no status
        if (!fromPolling) {
          console.log(`🔍 Final status for "${discussion.title}": ${finalStatus}`);
        }
        
        return {
          ...discussion,
          flowId: discussion.discussionId, // Map discussionId to flowId for compatibility
          contactName: discussion.title, // Map title to contactName so getThreadTitle can find it
          subject: discussion.title, // Also map to subject as fallback
          status: finalStatus, // Use actual status from API, fallback to 'open'
          primaryTag: discussion.primaryTag || 'discussion', // Use actual primaryTag from API
          secondaryTags: discussion.secondaryTags || [], // Use actual secondaryTags from API
          lastMessage: `${participantNames.join(', ') || 'Team discussion'} • ${discussion.messageCount || 0} messages`, // Preview text
          createdByName: discussion.createdBy === user.userId ? (user.displayName || 'You') : `User ${discussion.createdBy.slice(-4)}`,
          participantNames
        };
      });
      
      if (!fromPolling) {
        console.log('✅ Transformed discussions with status:', transformedDiscussions.map(d => ({ 
          title: d.title, 
          status: d.status, 
          primaryTag: d.primaryTag,
          secondaryTags: d.secondaryTags 
        })));
      }
      
      setDiscussions(transformedDiscussions);
      
    } catch (err) {
      console.error('Error loading discussions:', err);
      if (!fromPolling) {
        setError('Failed to load discussions');
      }
    } finally {
      if (!fromPolling) {
        setDiscussionsLoading(false);
      }
    }
  };

  const loadMessages = async (threadId: string, fromPolling = false) => {
    try {
      if (!fromPolling) {
        console.log('🔄 Loading messages for thread:', threadId);
      }
      
      // Pass userId as query parameter for the updated Lambda
      const response = await fetch(`${apiBase}/webhook/threads/${encodeURIComponent(threadId)}?userId=${encodeURIComponent(user!.userId)}`);
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      if (!fromPolling) {
        console.log('📥 Raw API response:', data);
      }
      
      const messagesArray = data.messages || [];
      if (!fromPolling) {
        console.log('📥 Processed messages array:', messagesArray);
        console.log('📥 Setting messages count:', messagesArray.length);
      }
      
      setMessages(messagesArray);
      
      // Update the flow with the actual last message content
      if (messagesArray.length > 0) {
        // Sort messages by timestamp to get the true last message
        const sortedMessages = [...messagesArray].sort((a, b) => {
          const timestampA = a.Timestamp || a.timestamp || 0;
          const timestampB = b.Timestamp || b.timestamp || 0;
          return timestampB - timestampA; // Most recent first
        });
        
        const lastMessage = sortedMessages[0];
        let messageContent = lastMessage.Body || lastMessage.Text || lastMessage.body || lastMessage.text || '';
        
        // For email messages, prefer subject if body is empty or too long
        if (lastMessage.Channel === 'email' || lastMessage.channel === 'email') {
          const subject = lastMessage.Subject || lastMessage.subject || '';
          if (subject && (!messageContent || messageContent.length > 100)) {
            messageContent = subject;
          } else if (messageContent.length > 100) {
            messageContent = messageContent.substring(0, 100) + '...';
          }
        }
        
        // Add direction indicator for clarity
        if (messageContent.trim()) {
          const direction = lastMessage.Direction || lastMessage.direction || 'unknown';
          const indicator = direction === 'outgoing' ? '➤ ' : '← ';
          const finalContent = `${indicator}${messageContent.trim()}`;
          
          setFlows(prevFlows => 
            prevFlows.map(flow => 
              flow.flowId === threadId 
                ? { ...flow, lastMessage: finalContent }
                : flow
            )
          );
        }
      }
      
      if (!fromPolling) {
        console.log('✅ Messages set for thread:', threadId);
      }
    } catch (err) {
      console.error('❌ Error loading messages:', err);
      setMessages([]); // Clear messages on error
    }
  };

  const loadTeamMessages = async (threadId: string) => {
    try {
      // Use the team messages endpoint from original code
      const response = await fetch(`${API_ENDPOINTS.FLOW_COMMENTS}/flows/${encodeURIComponent(threadId)}/comments`);
      if (!response.ok) throw new Error('Failed to load team messages');
      
      const data = await response.json();
      // The API returns { comments: Array } so extract the comments array
      setTeamMessages(Array.isArray(data.comments) ? data.comments : []);
    } catch (err) {
      console.error('Error loading team messages:', err);
    }
  };

  const loadDiscussionMessages = async (discussionId: string) => {
    if (!user?.userId) return;
    
    try {
      const messages = await discussionsService.getMessages(discussionId, user.userId);
      setDiscussionMessages(messages);
      
    } catch (err) {
      console.error('Error loading discussion messages:', err);
      setDiscussionMessages([]);
    }
  };

  const handleThreadSelect = async (threadId: string) => {
    console.log('🎯 Thread selected:', threadId);
    console.log('🎯 Previous thread was:', selectedThreadId);
    setSelectedThreadId(threadId);
    
    // Immediately clear unread indicators in UI for instant feedback
    setFlows(prevFlows => 
      prevFlows.map(flow => 
        flow.flowId === threadId 
          ? { ...flow, hasUnreadMessages: false, unreadCount: 0 }
          : flow
      )
    );
    
    // Auto-mark thread as read when opened
    if (user?.userId) {
      try {
        await markThreadAsRead(threadId);
      } catch (error) {
        console.error('Failed to mark thread as read:', error);
        // Restore unread indicators if the API call failed
        setFlows(prevFlows => 
          prevFlows.map(flow => 
            flow.flowId === threadId 
              ? { ...flow, hasUnreadMessages: true, unreadCount: flow.unreadCount || 1 }
              : flow
          )
        );
      }
    }
  };

  // Function to mark a thread as read
  const markThreadAsRead = async (threadId: string) => {
    try {
      const response = await fetch(`${apiBase}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.userId,
          threadId: threadId
          // No messageIds = marks ALL unread messages in thread
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.status}`);
      }
      
      console.log(`✅ Marked thread ${threadId} as read`);
      
      // Update local state to remove unread indicators immediately
      setFlows(prevFlows => 
        prevFlows.map(flow => 
          flow.flowId === threadId 
            ? { ...flow, hasUnreadMessages: false, unreadCount: 0 }
            : flow
        )
      );
      
    } catch (error) {
      console.error('Error marking thread as read:', error);
      throw error;
    }
  };

  // Polling for real-time message updates
  const pollForNewMessages = async () => {
    if (!selectedThreadId || !user?.userId) return;
    
    try {
      setIsCheckingMessages(true);
      
      // Use the existing loadMessages function with polling flag
      await loadMessages(selectedThreadId, true);
      
      // Also refresh team messages (without triggering loading state)
      await loadTeamMessages(selectedThreadId);
      
    } catch (err) {
      console.error('Error polling for messages:', err);
    } finally {
      setIsCheckingMessages(false);
    }
  };

  // Start/stop polling based on thread selection and view
  useEffect(() => {
    if (selectedThreadId && currentView === 'inbox') {
      setIsPolling(true);
      lastMessageCountRef.current = messages.length;
      
      // Poll every 3 seconds when thread is active
      pollingIntervalRef.current = setInterval(pollForNewMessages, 3000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);
      };
    } else {
      // Stop polling when no thread selected or not in inbox view
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
    }
  }, [selectedThreadId, currentView, messages.length]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Function to fetch participant names
  const fetchParticipantNames = async (participantIds: string[]) => {
    if (!participantIds || participantIds.length === 0) return;
    
    setParticipantsLoading(true);
    try {
      const namePromises = participantIds.map(async (userId: string) => {
        if (participantNames[userId]) {
          return { userId, name: participantNames[userId] };
        }
        
        try {
          const userInfo = await getUserById(userId);
          const displayName = userInfo.displayName || userInfo.subscriber_email || `User ${userId.slice(-4)}`;
          return { userId, name: displayName };
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return { userId, name: `User ${userId.slice(-4)}` };
        }
      });
      
      const names = await Promise.all(namePromises);
      const newNames = { ...participantNames };
             names.forEach(({ userId, name }: { userId: string; name: string }) => {
        newNames[userId] = name;
      });
      setParticipantNames(newNames);
    } catch (error) {
      console.error('Error fetching participant names:', error);
    } finally {
      setParticipantsLoading(false);
    }
  };

  // Effect to load participant names when selection changes
  useEffect(() => {
    const currentFlow = currentView === 'discussions' 
      ? discussions.find(d => d.discussionId === selectedDiscussionId)
      : flows.find(f => f.flowId === selectedThreadId);
    
    if (currentFlow && Array.isArray(currentFlow.participants) && currentFlow.participants.length > 0) {
      fetchParticipantNames(currentFlow.participants);
    }
  }, [selectedThreadId, selectedDiscussionId, flows, discussions, currentView]);

  // Copy the exact functions from MessageList
  async function sendWhatsAppMessage(to: string, body: string) {
    // IMPORTANT: Extract actual phone number from flowId if needed
    let actualRecipient = to;
    
    // If 'to' looks like a UUID (flowId), look up the actual phone number
    if (to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const flow = flows.find(f => f.flowId === to);
      if (flow?.contactIdentifier) {
        actualRecipient = flow.contactIdentifier;
        console.log(`🔄 Converted flowId ${to} to phone number ${actualRecipient}`);
        
        // Check if this is a personal WhatsApp flow (has Channel: 'whatsapp')
        if (flow.Channel === 'whatsapp') {
          console.log('📱 Detected personal WhatsApp flow, routing to local OpenWA service');
          
          // Route to local OpenWA service
          const res = await fetch(`http://localhost:3001/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: user!.userId,
              phoneNumber: actualRecipient,
              message: body
            }),
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`OpenWA service error: ${errorText}`);
          }
          
          return res.json();
        }
      } else {
        console.error('❌ Could not find contact identifier for flowId:', to);
        throw new Error('Could not find phone number for this conversation');
      }
    }
    
    // Default to business WhatsApp API for non-personal flows
    console.log('📱 Routing to business WhatsApp API');
    const payload = { to: actualRecipient, text: body, userId: user!.userId };
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
    // IMPORTANT: Extract actual email address from flowId if needed (same logic as WhatsApp)
    let actualRecipient = to;
    
    // If 'to' looks like a UUID (flowId), look up the actual email address
    if (to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const flow = flows.find(f => f.flowId === to);
      if (flow?.contactIdentifier || flow?.contactEmail || flow?.fromEmail) {
        // Try different email fields in order of preference
        actualRecipient = flow.contactIdentifier || flow.contactEmail || flow.fromEmail;
        console.log(`🔄 Converted flowId ${to} to email address ${actualRecipient}`);
      } else {
        console.error('❌ Could not find email address for flowId:', to);
        throw new Error('Could not find email address for this conversation');
      }
    }

    const payload: any = {
      to: actualRecipient, // Use the actual email address
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
        // Check if this is a template message or regular message
        if (messageData.templateName) {
          // Send template message with full template data
          const templatePayload = {
            to: recipient,
            userId: user!.userId,
            templateName: messageData.templateName,
            templateLanguage: messageData.templateLanguage,
            templateComponents: messageData.templateComponents
          };
          console.log('WhatsApp template payload:', templatePayload);
          
          const res = await fetch(`${apiBase}/send/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templatePayload),
          });
          
          if (!res.ok) throw new Error(await res.text());
          await res.json();
        } else {
          // Regular WhatsApp message
          await sendWhatsAppMessage(recipient, messageData.content);
        }
      } else if (messageData.channel === 'whatsapp-personal') {
        // Personal WhatsApp - route directly to local OpenWA service
        console.log('📱 Sending personal WhatsApp message via OpenWA service');
        
        const res = await fetch(`http://localhost:3001/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user!.userId,
            phoneNumber: recipient,
            message: messageData.content
          }),
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`OpenWA service error: ${errorText}`);
        }
        
        await res.json();
      } else {
        await sendEmailMessage(
          recipient,
          messageData.subject || 'No subject',
          messageData.content, // plain text
          messageData.html || messageData.content, // HTML content
          messageData.originalMessageId // Pass original Message-ID for threading
        );
      }
      
      // Reload data (use fromPolling=false to ensure fresh data after sending)
      await loadInboxData(false);
      if (selectedThreadId) {
        await loadMessages(selectedThreadId, false);
      }
      
      // Update the flow with the sent message content for immediate UI feedback
      if (selectedThreadId && messageData.content) {
        let content = messageData.content.trim();
        
        // For email, show subject if available
        if (messageData.channel === 'email' && messageData.subject) {
          content = messageData.subject;
        }
        
        // Add outgoing indicator since this is a sent message
        const finalContent = `➤ ${content}`;
        
        setFlows(prevFlows => 
          prevFlows.map(flow => 
            flow.flowId === selectedThreadId 
              ? { ...flow, lastMessage: finalContent }
              : flow
          )
        );
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
      const response = await fetch(`${API_ENDPOINTS.FLOW_COMMENTS}/flows/${safeId}/comments`, {
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

  const handleDiscussionsClick = async () => {
    setCurrentView('discussions');
    setSelectedThreadId(null); // Clear any selected thread when switching to discussions
    setSelectedDiscussionId(null); // Clear selected discussion
    
    // Load real discussions from API
    await loadDiscussions(false);
  };

  const handleBackToInbox = () => {
    setCurrentView('inbox');
    setSelectedDiscussionId(null);
    setDiscussionMessages([]);
  };

  const handleDiscussionSelect = (discussionId: string) => {
    setSelectedDiscussionId(discussionId);
    // Load discussion messages from API
    loadDiscussionMessages(discussionId);
  };

  const handleSendDiscussionMessage = async (content: string) => {
    if (!selectedDiscussionId || !content.trim() || !user?.userId) return;

    try {
      const messagePayload = {
        discussionId: selectedDiscussionId,
        content: content.trim()
      };

      const newMessage = await discussionsService.createMessage(user.userId, messagePayload);
      
      // Reload discussion messages to get the latest
      await loadDiscussionMessages(selectedDiscussionId);
      
      // Update discussion last message
      setDiscussions(prev => prev.map(d => 
        d.discussionId === selectedDiscussionId 
          ? { 
              ...d, 
              lastMessage: content.trim(), 
              lastMessageAt: newMessage.createdAt, 
              messageCount: d.messageCount + 1 
            }
          : d
      ));
      
    } catch (err) {
      console.error('Error sending discussion message:', err);
    }
  };

  const handleCreateDiscussion = async (discussionData: any) => {
    try {
      // Create the discussion using the real API
      const response = await fetch(API_ENDPOINTS.DISCUSSIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'createDiscussion',
          userId: user!.userId,
          title: discussionData.title,
          participants: discussionData.participants || [],
          tags: [],
          status: 'open', // Set initial status
          primaryTag: 'discussion', // Set primary tag
          secondaryTags: [] // Set empty secondary tags
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create discussion');
      }

      const newDiscussion = await response.json();
      console.log('✅ Created discussion:', newDiscussion);

      // Transform the new discussion to match ThreadList expectations
      const participantNames = newDiscussion.participants.map((id: string) => 
        id === user?.userId ? (user?.displayName || 'You') : `User ${id.slice(-4)}`
      );
      
      const transformedDiscussion = {
        ...newDiscussion,
        flowId: newDiscussion.discussionId,
        contactName: newDiscussion.title,
        subject: newDiscussion.title,
        status: newDiscussion.status || 'open', // Use actual status from API response
        primaryTag: newDiscussion.primaryTag || 'discussion',
        secondaryTags: newDiscussion.secondaryTags || [],
        lastMessage: `${participantNames.join(', ') || 'Team discussion'} • ${newDiscussion.messageCount || 0} messages`,
        createdByName: newDiscussion.createdBy === user?.userId ? (user?.displayName || 'You') : `User ${newDiscussion.createdBy.slice(-4)}`,
        participantNames
      };

      // Add the transformed discussion to the local state
      setDiscussions(prev => [transformedDiscussion, ...prev]);

      // Create the initial message
      if (discussionData.content) {
        await fetch(API_ENDPOINTS.DISCUSSIONS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'createMessage',
            userId: user!.userId,
            discussionId: newDiscussion.discussionId,
            content: discussionData.content
          }),
        });
      }

      // Switch to discussions view and select the new discussion
      setCurrentView('discussions');
      setSelectedDiscussionId(newDiscussion.discussionId);
      
      // Load the messages for the new discussion
      if (discussionData.content) {
        setDiscussionMessages([{
          messageId: `msg-${Date.now()}`,
          discussionId: newDiscussion.discussionId,
          authorId: user?.userId || 'user-1',
          authorName: user?.displayName || 'You',
          content: discussionData.content,
          createdAt: new Date().toISOString()
        }]);
      }

    } catch (error) {
      console.error('Error creating discussion:', error);
      throw error;
    }
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
      
      const FUNCTION_URL = API_ENDPOINTS.FLOW_STATUS_UPDATE;
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

  // Handle discussion status update
  const handleDiscussionStatusSelect = async (status: 'open' | 'waiting' | 'resolved' | 'overdue') => {
    if (!selectedDiscussionId || !user?.userId) return;

    try {
      const updated = await discussionsService.updateDiscussionStatus(selectedDiscussionId, user.userId, { status });
      
      // Update discussion in local state
      setDiscussions(prev => prev.map(d => 
        d.discussionId === selectedDiscussionId 
          ? { ...d, status: status }
          : d
      ));
      
    } catch (err) {
      console.error('Error updating discussion status:', err);
    }
  };

  // Handle flow updates from MessageView
  const handleFlowUpdate = (updatedFlow: any) => {
    console.log('🔄 Flow Update Received:', updatedFlow);
    console.log('🔄 Updated flow ID:', updatedFlow.flowId);
    console.log('🔄 Current flows count:', flows.length);
    
    // Debug: log first few existing flow IDs
    console.log('🔄 Existing flow IDs:', flows.slice(0, 3).map(f => f.flowId));
    
    if (currentView === 'discussions') {
      // Handle discussion updates
      setDiscussions(prevDiscussions => {
        console.log('🔄 Looking for discussionId:', updatedFlow.discussionId);
        console.log('🔄 Available discussionIds:', prevDiscussions.map(d => d.discussionId));
        
        const updated = prevDiscussions.map(discussion => 
          discussion.discussionId === updatedFlow.discussionId ? updatedFlow : discussion
        );
        console.log('🔄 Updated discussions count:', updated.length);
        console.log('🔄 Updated discussion found:', updated.find(d => d.discussionId === updatedFlow.discussionId));
        return updated;
      });
    } else {
      // Handle regular flow updates
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
    }
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
      
      // Debug user object
      console.log('User object for reminder:', user);
      
      if (!user!.email) {
        alert('User email not found. Please refresh the page and try again.');
        return;
      }
      
      const userEmail = user!.email;
      console.log('Using user email:', userEmail);
      
      const payload = {
        threadId: selectedThreadId,
        userId: user!.userId,
        userEmail: userEmail, // User's email for sending reminder to themselves
        reminderType: reminderData.type,
        scheduledTime: scheduledTime,
        note: reminderData.note || '',
        threadTitle: getThreadTitle(selectedThreadId),
        contactEmail: currentFlow.fromEmail || currentFlow.fromPhone || 'Unknown Contact'
      };

      // Validate all required fields are present
      const requiredFields = {
        threadId: payload.threadId,
        userId: payload.userId,
        userEmail: payload.userEmail,
        reminderType: payload.reminderType,
        scheduledTime: payload.scheduledTime
      };
      
      const missingFields = Object.entries(requiredFields)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
      
      if (missingFields.length > 0) {
        alert(`Missing required fields: ${missingFields.join(', ')}`);
        console.error('Missing fields:', missingFields, 'Payload:', payload);
        return;
      }
      
      console.log('Setting reminder with payload:', payload);
      
      // Call API to store reminder and schedule it
      const response = await fetch(API_ENDPOINTS.REMINDERS, {
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
    
    // First priority: Use the new contactIdentifier field
    if (flow.contactIdentifier) {
      const formatted = formatEmailAddress(flow.contactIdentifier);
      console.log('InboxContainer - Using contactIdentifier:', flow.contactIdentifier, '→', formatted);
      return formatted;
    }
    
    // Fallback: Existing contact fields for backward compatibility
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
    
    // BACKWARD COMPATIBILITY: For old flows where flowId IS the contact identifier
    if (flow.flowId) {
      // Check if flowId looks like an email or phone number (old structure)
      if (flow.flowId.includes('@') || flow.flowId.startsWith('+')) {
        const formatted = formatEmailAddress(flow.flowId);
        console.log('InboxContainer - Using legacy flowId as contact:', flow.flowId, '→', formatted);
        return formatted;
      }
    }
    
    // Final fallbacks - improved for UUID flowIds
    return flow.contactName || flow.subject || 'Unknown Contact';
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

  // Filter discussions based on current filters
  const filteredDiscussions = useMemo(() => {
    if (currentView !== 'discussions') return discussions;

    console.log('🔍 Filtering discussions:', {
      totalDiscussions: discussions.length,
      statusFilter,
      discussions: discussions.map(d => ({ id: d.discussionId, status: d.status, title: d.title }))
    });

    let filtered = discussions;

    // Apply view filter (All Messages, Shared with me, Shared by me, Deleted)
    if (viewFilter === 'shared-with-me') {
      filtered = filtered.filter(d => 
        d.participants.includes(user?.userId || '') && d.createdBy !== user?.userId
      );
    } else if (viewFilter === 'shared-by-me') {
      filtered = filtered.filter(d => d.createdBy === user?.userId);
    } else if (viewFilter === 'deleted') {
      filtered = filtered.filter(d => 
        Array.isArray(d.secondaryTags) && d.secondaryTags.includes('deleted')
      );
    } else if (viewFilter === 'all') {
      // Show all discussions except deleted ones
      filtered = filtered.filter(d => 
        !Array.isArray(d.secondaryTags) || !d.secondaryTags.includes('deleted')
      );
    }

    console.log('🔍 After view filter:', filtered.length);

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => {
        console.log(`🔍 Checking discussion ${d.title}: status="${d.status}" vs filter="${statusFilter}"`);
        return d.status === statusFilter;
      });
    }

    console.log('🔍 After status filter:', {
      filteredCount: filtered.length,
      filteredDiscussions: filtered.map(d => ({ id: d.discussionId, status: d.status, title: d.title }))
    });

    return filtered;
  }, [discussions, viewFilter, statusFilter, categoryFilter, user?.userId, currentView]);

  // Update the handleViewFilterChange to work with discussions
  const handleViewFilterChange = (filter: 'all' | 'shared-with-me' | 'shared-by-me' | 'deleted') => {
    setViewFilter(filter);
    setSelectedThreadId(null);
    setSelectedDiscussionId(null);
  };

  // Update the filtered flows to use the new discussion filtering
  const displayedItems = useMemo(() => {
    if (currentView === 'discussions') {
      return filteredDiscussions;
    }
    return flows; // This shows all flows for inbox view
  }, [currentView, filteredDiscussions, flows]);

  // Update the count display
  const getItemCount = () => {
    if (currentView === 'discussions') {
      return filteredDiscussions.length;
    }
    return flows.length;
  };

    // Get current participants for display
  const getCurrentParticipants = () => {
    const currentFlow = currentView === 'discussions' 
      ? discussions.find(d => d.discussionId === selectedDiscussionId)
      : flows.find(f => f.flowId === selectedThreadId);
    
    if (!currentFlow || !Array.isArray(currentFlow.participants)) {
      return [];
    }
    
    return currentFlow.participants.map((userId: string) => ({
      userId,
      name: participantNames[userId] || `User ${userId.slice(-4)}`,
      isCurrentUser: userId === user?.userId
    }));
  };

  // Add participant function
  // Helper function to update a flow (copied from MessageList)
  async function updateFlow(flowId: string, updates: Record<string, any>) {
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
  }

  // Add participant function (copied from MessageList and adapted)
  async function addParticipant(flowId: string, newEmail: string) {
    // 1) Find the flow object in local state
    const flowObj = currentView === 'discussions' 
      ? discussions.find(d => d.discussionId === flowId)
      : flows.find(f => f.flowId === flowId);
    
    if (!flowObj) {
      throw new Error("Flow not found");
    }

    // 2) Lookup the userId for `newEmail`
    const API_BASE = API_ENDPOINTS.INBOX_API_BASE;
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
    const existing: string[] = Array.isArray(flowObj.participants)
      ? flowObj.participants
      : [];

    // 5) Dedupe via a Set, then add the new userId
    const deduped = new Set(existing);
    deduped.add(newUserId);

    // 6) Convert back to array
    const updatedParticipants = Array.from(deduped);

    // 7) Call updateFlow, sending the full deduped array of userIds
    let updatedFlowData: any;
    try {
      const { updated } = await updateFlow(flowId, {
        participants: updatedParticipants,
      });
      updatedFlowData = updated;
    } catch (updateErr: any) {
      console.error("Error updating flow participants:", updateErr);
      throw new Error("Could not update flow participants");
    }

    // 8) Update local React state so the UI refreshes
    if (currentView === 'discussions') {
      setDiscussions(prev => prev.map(d => 
        d.discussionId === updatedFlowData.flowId 
          ? { ...d, participants: updatedParticipants }
          : d
      ));
    } else {
      setFlows(prev => prev.map(f => 
        f.flowId === updatedFlowData.flowId 
          ? { ...f, participants: updatedParticipants }
          : f
      ));
    }

    // Refresh participant names
    fetchParticipantNames(updatedParticipants);
  }

  const handleAddParticipant = async () => {
    if (!selectedThreadId && !selectedDiscussionId) return;
    
    const email = prompt('Enter email to add:');
    if (email) {
      try {
        const currentFlowId = selectedThreadId || selectedDiscussionId;
        if (currentFlowId) {
          await addParticipant(currentFlowId, email);
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  // Handle department selection
  const handleDepartmentSelect = async (department: string) => {
    const targetFlow = currentView === 'discussions' 
      ? discussions.find(d => d.discussionId === selectedDiscussionId)
      : currentFlow;

    if (!targetFlow) {
      alert('No conversation selected');
      return;
    }

    try {
      const flowId = targetFlow.flowId || targetFlow.discussionId;
      const newPrimaryTag = department === '' ? undefined : department;
      
      // Update the flow
      const updated = await updateFlow(flowId, { 
        primaryTag: newPrimaryTag
      });

      // Update local state
      if (currentView === 'discussions') {
        setDiscussions(discussions.map(d => 
          d.discussionId === selectedDiscussionId ? { ...d, primaryTag: newPrimaryTag } : d
        ));
      } else {
        setFlows(flows.map(f => 
          f.flowId === selectedThreadId ? { ...f, primaryTag: newPrimaryTag } : f
        ));
      }

      setShowDepartmentDropdown(false);
      setDepartmentSearch('');
    } catch (error) {
      console.error('Error updating department:', error);
      alert('Failed to update department');
    }
  };

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(e.target as Node)) {
        setShowDepartmentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            onClick={() => loadInboxData(false)}
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
    <>
      {/* Add pulse animation CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      
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
      <div style={{
        position: 'absolute',
        top: 0,
        left: '179px', // Adjusted to overlap by 1px for seamless border connection
        right: 0, // Extend to the end
        padding: '0 16px', // Uniform padding for vertical centering
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        borderLeft: '1px solid #e5e7eb', // Add left border to connect with vertical line
        background: '#FFFBFA',
        zIndex: 1002,
        height: '60px', // Fixed height for the status bar
        boxSizing: 'border-box'
      }}>
        {currentView === 'discussions' ? (
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
                position: 'relative',
                outline: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>
                All
              </span>
              {statusFilter === 'all' && (
                <span style={{
                  display: 'block',
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  bottom: -14,
                  height: 4,
                  background: '#DE1780',
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  zIndex: 0,
                }} />
              )}
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
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
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
                    bottom: -14,
                    height: 4,
                    background: s === 'open' ? '#10b981' : s === 'waiting' ? '#f59e0b' : s === 'resolved' ? '#6b7280' : '#ef4444',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    zIndex: 0,
                  }} />
                )}
              </button>
            ))}
            


          </div>
        ) : (
          <div style={{
            display: 'flex',
            fontSize: '15px',
            gap: '12px',
            alignItems: 'center',
          }}>
            <button
              onClick={() => setStatusFilter('all')}
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
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>
                All
              </span>
              {statusFilter === 'all' && (
                <span style={{
                  display: 'block',
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  bottom: -14,
                  height: 4,
                  background: '#DE1780',
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  zIndex: 0,
                }} />
              )}
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
                    bottom: -14,
                    height: 4,
                    background: s === 'open' ? '#10b981' : s === 'waiting' ? '#f59e0b' : s === 'resolved' ? '#6b7280' : '#ef4444',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    zIndex: 0,
                  }} />
                )}
              </button>
            ))}
            


            
            {/* Participants Display & Share */}
            {(selectedThreadId || selectedDiscussionId) && (() => {
              const participants = getCurrentParticipants();
              
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginLeft: '24px',
                  paddingLeft: '24px',
                  borderLeft: '1px solid #e5e7eb'
                }}>
                  {participants.length > 0 ? (
                    // Show full participants display when there are participants
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Users size={16} style={{ color: '#6b7280' }} />
                        <span style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          fontWeight: '500'
                        }}>
                          Participants:
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        maxWidth: '300px',
                        overflow: 'hidden'
                      }}>
                        {participantsLoading ? (
                          <span style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            Loading...
                          </span>
                        ) : (
                          participants.slice(0, 3).map((participant: {userId: string; name: string; isCurrentUser: boolean}, index: number) => (
                            <div key={participant.userId} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: participant.isCurrentUser ? '#10b981' : '#6b7280'
                              }} />
                              <span style={{
                                fontSize: '14px',
                                color: '#374151',
                                fontWeight: participant.isCurrentUser ? '600' : '400'
                              }}>
                                {participant.isCurrentUser ? 'You' : participant.name}
                              </span>
                            </div>
                          ))
                        )}
                        {participants.length > 3 && (
                          <span style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            +{participants.length - 3} more
                          </span>
                        )}
                      </div>
                      
                      {/* Add Participant Button */}
                      <button
                        onClick={handleAddParticipant}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f9fafb',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          marginLeft: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                        title="Add participant"
                      >
                        <Plus size={14} style={{ color: '#6b7280' }} />
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })()}
            
            {/* Real-time indicator when polling is active */}
            {isPolling && selectedThreadId && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: isCheckingMessages ? '#f59e0b' : '#10b981',
                marginLeft: '8px',
                padding: '4px 8px',
                background: isCheckingMessages ? '#fffbeb' : '#f0fdf4',
                borderRadius: '12px',
                border: isCheckingMessages ? '1px solid #fed7aa' : '1px solid #bbf7d0'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isCheckingMessages ? '#f59e0b' : '#10b981',
                  animation: 'pulse 2s infinite'
                }} />
                {isCheckingMessages ? 'Checking...' : 'Live'}
              </div>
            )}
          </div>
        )}

        {/* Right-side action buttons - only show for inbox view when a thread is selected */}
        {((currentView === 'inbox' && selectedThreadId) || (currentView === 'discussions' && selectedDiscussionId)) && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Department dropdown */}
            <div style={{ position: 'relative' }} ref={departmentDropdownRef}>
              <button
                onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
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
                {currentView === 'discussions' 
                  ? (discussions.find(d => d.discussionId === selectedDiscussionId)?.primaryTag?.charAt(0).toUpperCase() + discussions.find(d => d.discussionId === selectedDiscussionId)?.primaryTag?.slice(1) || 'Department')
                  : (currentFlow?.primaryTag?.charAt(0).toUpperCase() + currentFlow?.primaryTag?.slice(1) || 'Department')
                }
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M5 8l5 5 5-5" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {showDepartmentDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0px',
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
                  <input
                    type="text"
                    value={departmentSearch}
                    onChange={e => setDepartmentSearch(e.target.value)}
                    placeholder="Search departments..."
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
                    Department (choose one):
                  </div>
                  <div style={{ height: '100%', overflowY: 'auto' }}>
                    {primaryTagOptions
                      .filter(dept => dept.toLowerCase().includes(departmentSearch.toLowerCase()))
                      .map(dept => {
                        const currentDept = currentView === 'discussions' 
                          ? discussions.find(d => d.discussionId === selectedDiscussionId)?.primaryTag
                          : currentFlow?.primaryTag;
                        const isSelected = currentDept === dept;
                        
                        return (
                          <div
                            key={dept}
                            onClick={() => handleDepartmentSelect(dept)}
                            style={{
                              padding: '6px 8px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '14px',
                              color: isSelected ? '#DE1785' : '#374151',
                              background: isSelected ? '#FDE7F1' : 'transparent',
                              transition: 'all 0.2s',
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
                            {dept.charAt(0).toUpperCase() + dept.slice(1)}
                          </div>
                        );
                      })}
                    {/* Clear department option */}
                    <div
                      onClick={() => handleDepartmentSelect('')}
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
                      Clear department
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                {currentView === 'discussions' 
                  ? (discussions.find(d => d.discussionId === selectedDiscussionId)?.status?.charAt(0).toUpperCase() + discussions.find(d => d.discussionId === selectedDiscussionId)?.status?.slice(1) || 'Select Status')
                  : (currentFlow?.status?.charAt(0).toUpperCase() + currentFlow?.status?.slice(1) || 'Select Status')
                }
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
                  {(['open', 'waiting', 'resolved', 'overdue'] as const).map(s => {
                    const currentStatus = currentView === 'discussions' 
                      ? discussions.find(d => d.discussionId === selectedDiscussionId)?.status
                      : currentFlow?.status;
                    
                    return (
                      <div
                        key={s}
                        onClick={() => {
                          if (currentView === 'discussions') {
                            handleDiscussionStatusSelect(s);
                          } else {
                            handleStatusSelect(s);
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#374151',
                          background: currentStatus === s ? '#f3f4f6' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = currentStatus === s ? '#f3f4f6' : 'transparent')
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
                    );
                  })}
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
        )}
      </div>

      {/* Main content area - offset by status bar height */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Debug logging */}
        {currentView === 'discussions' && (() => {
          console.log('🔍 Rendering ThreadList with discussions:', {
            discussionsCount: discussions.length,
            discussions: discussions,
            threads: discussions.map(d => d.flowId || d.discussionId),
            selectedDiscussionId
          });
          return null;
        })()}
        {/* Complete ThreadList component (includes left sidebar + thread list) */}
        <ThreadList
          threads={currentView === 'discussions' ? filteredDiscussions.map(d => d.flowId || d.discussionId) : threads}
          flows={currentView === 'discussions' ? filteredDiscussions : flows}
          selectedId={currentView === 'discussions' ? selectedDiscussionId : selectedThreadId}
          onSelect={currentView === 'discussions' ? handleDiscussionSelect : handleThreadSelect}
          userId={user!.userId}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={handleCategoryFilterChange}
          onCompose={handleNewMessage}
          onDiscussionsClick={handleDiscussionsClick}
          currentView={currentView}
          onBackToInbox={handleBackToInbox}
          viewFilter={viewFilter}
          onViewFilterChange={handleViewFilterChange}
          onRefresh={currentView === 'discussions' ? () => loadDiscussions(true) : () => loadInboxData(true)}
        />

        {/* Message View */}
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <MessageView
            messages={currentView === 'discussions' ? discussionMessages : messages}
            selectedThreadId={currentView === 'discussions' ? selectedDiscussionId : selectedThreadId}
            isLoading={loading}
            onSendMessage={currentView === 'discussions' ? undefined : handleComposeMessage}
            flow={currentView === 'discussions' ? discussions.find(d => d.discussionId === selectedDiscussionId) : currentFlow}
            onReply={handleReply}
            onShare={handleShare}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={handleCategoryFilterChange}
            onFlowUpdate={handleFlowUpdate}
            onOpenAIChat={handleOpenAIChatLocal}
            currentView={currentView}
            onSendDiscussionMessage={currentView === 'discussions' ? handleSendDiscussionMessage : undefined}
            onDiscussionStatusSelect={currentView === 'discussions' ? handleDiscussionStatusSelect : undefined}
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
        onCreateDiscussion={handleCreateDiscussion}
      />

      {/* Reminder Modal */}
      <ReminderModal />
    </div>
    </>
  );
};

export default InboxContainer; 