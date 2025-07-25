import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Inbox, Users, Send, Trash2, MessageCircle } from 'lucide-react';
import { connectionsService, ConnectionsResponse, UserConnections } from '../../../../services/connectionsService';
import { useAuth } from '../../../AuthContext';
import { API_ENDPOINTS } from '../../../../config/api';

type Status = 'open' | 'waiting' | 'resolved' | 'overdue';
type ViewFilter = "owned" | "sharedWithMe" | "sharedByMe" | "deleted";

interface Props {
  threads: string[];
  flows: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userId: string;
  statusFilter?: Status | 'all';
  categoryFilter?: string[];
  onCategoryFilterChange?: (categories: string[]) => void;
  onCompose?: () => void;
  onDiscussionsClick?: () => void;
  currentView?: 'inbox' | 'discussions';
  onBackToInbox?: () => void;
  viewFilter?: 'all' | 'shared-with-me' | 'shared-by-me' | 'deleted';
  onViewFilterChange?: (filter: 'all' | 'shared-with-me' | 'shared-by-me' | 'deleted') => void;
  onRefresh?: () => void; // Add callback for refreshing data
}

const ThreadList: React.FC<Props> = ({ 
  threads, 
  flows, 
  selectedId, 
  onSelect, 
  userId,
  statusFilter: externalStatusFilter = 'all',
  categoryFilter: externalCategoryFilter = [],
  onCategoryFilterChange,
  onCompose,
  onDiscussionsClick,
  currentView = 'inbox',
  onBackToInbox,
  viewFilter: externalViewFilter = 'all',
  onViewFilterChange,
  onRefresh
}) => {
  const { user } = useAuth();
  // State - use external viewFilter for discussions, internal for inbox
  const [internalViewFilter, setInternalViewFilter] = useState<'owned' | 'sharedWithMe' | 'sharedByMe' | 'deleted'>('owned');
  
  // Connections state
  const [userConnections, setUserConnections] = useState<UserConnections | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  
  // Account filtering state
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<{
    type: 'all' | 'gmail' | 'whatsapp';
    accountId?: string;
    accountEmail?: string;
  }>({ type: 'all' });
  
  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastThreadCountRef = useRef<number>(0);
  
  // Use external filters for discussions, internal for inbox
  const currentViewFilter = currentView === 'discussions' ? externalViewFilter : internalViewFilter;
  const categoryFilter = externalCategoryFilter;
  const statusFilter = externalStatusFilter;
  
  // Convert between external and internal view filter formats
  const mapExternalToInternal = (external: 'all' | 'shared-with-me' | 'shared-by-me' | 'deleted'): 'owned' | 'sharedWithMe' | 'sharedByMe' | 'deleted' => {
    switch (external) {
      case 'all': return 'owned';
      case 'shared-with-me': return 'sharedWithMe';
      case 'shared-by-me': return 'sharedByMe';
      case 'deleted': return 'deleted';
      default: return 'owned';
    }
  };
  
  const handleViewFilterChange = (filter: 'owned' | 'sharedWithMe' | 'sharedByMe' | 'deleted') => {
    if (currentView === 'discussions' && onViewFilterChange) {
      // Map internal format to external format for discussions
      const externalFilter = filter === 'owned' ? 'all' : 
                           filter === 'sharedWithMe' ? 'shared-with-me' :
                           filter === 'sharedByMe' ? 'shared-by-me' : 'deleted';
      onViewFilterChange(externalFilter);
    } else {
      // Use internal state for inbox
      setInternalViewFilter(filter);
    }
  };
  
  // Use mapped filter for logic
  const actualViewFilter = currentView === 'discussions' ? mapExternalToInternal(externalViewFilter) : internalViewFilter;
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    inbox: true,
    shared: false,
    sharedByMe: false,
    deleted: false,
    mailboxes: true, // Keep for backwards compatibility
    connectedAccounts: true // Keep for backwards compatibility
  });

  // Refs
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user connections
  const fetchUserConnections = async () => {
    if (!userId) return;
    
    try {
      setConnectionsLoading(true);
      setConnectionsError(null);
      
      const connectionsData = await connectionsService.getUserConnections(userId);
      setUserConnections(connectionsData.connections);
      
      console.log('📧 User connections loaded:', connectionsData);
      
    } catch (error) {
      console.error('Error fetching user connections:', error);
      setConnectionsError('Failed to load connections');
    } finally {
      setConnectionsLoading(false);
    }
  };

  // Fetch connections on mount
  useEffect(() => {
    fetchUserConnections();
  }, [userId]);

  // Derived data
  const ownedFlows = useMemo(() => {
    const result = Array.isArray(flows) ? flows.filter(f => f.contactId === userId) : [];
    console.log('📋 ThreadList ownedFlows recalculated:', result.length, 'flows');
    return result;
  }, [flows, userId]);
  
  const sharedWithMe = useMemo(() => {
    return Array.isArray(flows) ? flows.filter(f =>
      Array.isArray(f.participants) &&
      f.participants.includes(userId) &&
      f.contactId !== userId
    ) : [];
  }, [flows, userId]);
  
  const sharedByMe = useMemo(() => {
    return ownedFlows.filter(f =>
      Array.isArray(f.participants) && f.participants.length > 0
    );
  }, [ownedFlows]);

  const categoryFilterOptions = useMemo(() => {
    const options = new Set<string>();
    options.add('all');
    ownedFlows.forEach(f => {
      // Add primary tags
      if (f.primaryTag) {
        options.add(f.primaryTag.toLowerCase());
      }
      
      // Add secondary tags
      if (Array.isArray(f.secondaryTags)) {
        f.secondaryTags.forEach((tag: string) => {
          if (tag) options.add(tag.toLowerCase());
        });
      }
      
      // Legacy support - add old tags/category
      if (Array.isArray(f.tags)) {
        f.tags.forEach((tag: string) => {
          if (tag) options.add(tag.toLowerCase());
        });
      }
      if (f.category) {
        options.add(f.category.toLowerCase());
      }
    });
    const result = Array.from(options).sort();
    console.log('📋 ThreadList categoryFilterOptions recalculated:', result);
    return result;
  }, [ownedFlows]);

  const filteredThreads = useMemo(() => {
    if (currentView === 'discussions') {
      console.log('🗣️ Discussion view is active. Using pre-filtered discussions.');
      console.log('🗣️ Received', flows.length, 'discussions from parent filter.');
      console.log('🗣️ Discussions:', flows.map(d => ({ id: d.discussionId, status: d.status, title: d.title })));
      
      // Use the pre-filtered discussions passed from InboxContainer
      // The parent has already applied status and view filtering
      return flows.map(d => d.flowId || d.discussionId);
    }
    let baseFlows: any[] = [];
    if (actualViewFilter === "owned") {
      baseFlows = ownedFlows.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (actualViewFilter === "sharedWithMe") {
      baseFlows = sharedWithMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (actualViewFilter === "sharedByMe") {
      baseFlows = sharedByMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (actualViewFilter === "deleted") {
      // Show only items with 'deleted' tag from all flows the user has access to
      baseFlows = [...ownedFlows, ...sharedWithMe, ...sharedByMe].filter(f => 
        Array.isArray(f.secondaryTags) && f.secondaryTags.includes('deleted')
      );
    } else {
      baseFlows = [];
    }

    // Apply account filtering
    if (selectedAccountFilter.type !== 'all') {
      console.log('🔍 FILTERING TRIGGERED! Account filter:', selectedAccountFilter);
      console.log('🔍 Total flows before filtering:', baseFlows.length);
      console.log('🔍 Sample flows:', baseFlows.slice(0, 3).map(f => ({
        flowId: f.flowId,
        contactIdentifier: f.contactIdentifier,
        contactEmail: f.contactEmail,
        fromEmail: f.fromEmail,
        Channel: f.Channel,
        subject: f.subject,
        threadingType: f.threadingType
      })));
      
      baseFlows = baseFlows.filter(f => {
        if (selectedAccountFilter.type === 'gmail') {
          // DEBUG: Log the flow data for Gmail filtering
          console.log('🔍 Gmail filter check for flow:', {
            flowId: f.flowId,
            contactId: f.contactId,
            contactIdentifier: f.contactIdentifier,
            contactEmail: f.contactEmail,
            fromEmail: f.fromEmail,
            Channel: f.Channel,
            subject: f.subject,
            threadingType: f.threadingType,
            selectedAccountEmail: selectedAccountFilter.accountEmail,
            selectedAccountId: selectedAccountFilter.accountId,
            isLegacyEmailFlow: f.flowId && f.flowId.includes('@')
          });
          
          // First check if this is an email flow at all
          const isEmailFlow = 
            // Check contactIdentifier for email pattern
            (f.contactIdentifier && f.contactIdentifier.includes('@')) ||
            // Check contactEmail field
            (f.contactEmail && f.contactEmail.includes('@')) ||
            // Check fromEmail field  
            (f.fromEmail && f.fromEmail.includes('@')) ||
            // BACKWARD COMPATIBILITY: Check if flowId itself is an email
            (f.flowId && f.flowId.includes('@'));
          
          if (!isEmailFlow) {
            console.log('❌ Not an email flow:', f.flowId);
            return false;
          }
          
          // For specific Gmail account filtering
          if (selectedAccountFilter.accountEmail && selectedAccountFilter.accountEmail !== 'SHOW_ALL_EMAILS') {
            // For Gmail, the flow belongs to the account if:
            // 1. The flow's contactId (owner) matches the user who owns the Gmail account
            // 2. The Gmail account email matches the expected account
            
                         // Find the Gmail account connection for this user
             const gmailAccount = userConnections?.gmail?.accounts?.find((account: any) => 
               account.id === selectedAccountFilter.accountId
             );
            
            if (gmailAccount) {
              // Check if this flow belongs to the user who owns this Gmail account
              // The Gmail account email should match the selected account email
              if (gmailAccount.email === selectedAccountFilter.accountEmail && f.contactId === userId) {
                console.log('✅ Gmail account match - flow belongs to user with this Gmail account:', f.flowId);
                return true;
              }
            }
            
            // BACKWARD COMPATIBILITY: Check if flowId itself is the email
            if (f.flowId && f.flowId.includes('@') && f.flowId === selectedAccountFilter.accountEmail) {
              console.log('✅ Legacy flowId email match:', f.flowId);
              return true;
            }
            
            console.log('❌ No Gmail account match for flow:', f.flowId);
            return false;
          }
          
          // Show ALL emails - we already checked isEmailFlow above
          console.log('✅ Email flow found (show all):', f.flowId);
          return true;
        } else if (selectedAccountFilter.type === 'whatsapp') {
          // Filter for WhatsApp messages - check phone fields INCLUDING contactIdentifier
          const flowIdentifier = f.contactIdentifier || f.contactPhone || f.fromPhone;
          
          // Check for individual WhatsApp contacts (phone numbers)
          if (flowIdentifier && (flowIdentifier.startsWith('+') || /^\d+$/.test(flowIdentifier))) {
            return true;
          }
          
          // Check for WhatsApp group chats (format: numbers@g.us)
          if (flowIdentifier && flowIdentifier.endsWith('@g.us')) {
            return true;
          }
          
          // Check if Channel is explicitly set to 'whatsapp'
          if (f.Channel === 'whatsapp') {
            return true;
          }
          
          // BACKWARD COMPATIBILITY: Check if flowId looks like a phone number
          if (f.flowId && (f.flowId.startsWith('+') || /^\d{10,}$/.test(f.flowId))) {
            return true;
          }
          
          return false;
        }
        return true;
      });
      
      console.log('🔍 FILTERING COMPLETE! Results:', baseFlows.length, 'flows');
      console.log('🔍 Filtered flow IDs:', baseFlows.map(f => f.flowId));
    }
  
    const baseFlowIds = new Set(baseFlows.map(f => f.flowId));
    let result = threads.filter(id => baseFlowIds.has(id));
  
    if (categoryFilter.length > 0) {
      const matching = new Set(
        baseFlows
          .filter(f => {
            // Check primary tag
            if (f.primaryTag && categoryFilter.some(filter => f.primaryTag.toLowerCase() === filter.toLowerCase())) {
              return true;
            }
            // Check secondary tags
            if (Array.isArray(f.secondaryTags) && f.secondaryTags.some((tag: string) => 
              tag && categoryFilter.some(filter => tag.toLowerCase() === filter.toLowerCase())
            )) {
              return true;
            }
            // Legacy support: check old tags and category
            const flowTags = Array.isArray(f.tags) ? f.tags : (f.category ? [f.category] : []);
            return flowTags.some((tag: string) => 
              tag && categoryFilter.some(filter => tag.toLowerCase() === filter.toLowerCase())
            );
          })
          .map(f => f.flowId)
      );
      result = result.filter(id => matching.has(id));
    }
  
    if (statusFilter !== "all") {
      const matching = new Set(
        baseFlows.filter(f => f.status === statusFilter).map(f => f.flowId)
      );
      result = result.filter(id => matching.has(id));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      
      // Debug: log the first flow to see its structure
      if (baseFlows.length > 0) {
        console.log('Sample flow data:', baseFlows[0]);
      }
      
      const matching = new Set(
        baseFlows
          .filter(f => {
            // Convert the entire flow object to string and search in it
            const flowString = JSON.stringify(f).toLowerCase();
            return flowString.includes(searchLower);
          })
          .map(f => f.flowId)
      );
      result = result.filter(id => matching.has(id));
    }

    // Apply sorting by date
    const flowsWithDates = result.map(id => {
      const flow = baseFlows.find(f => f.flowId === id);
      const date = new Date(flow?.createdAt || flow?.lastUpdated || flow?.timestamp || 0);
      return { id, date };
    });

    // Sort by date
    flowsWithDates.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.date.getTime() - a.date.getTime(); // Newest first
      } else {
        return a.date.getTime() - b.date.getTime(); // Oldest first
      }
    });

    return flowsWithDates.map(item => item.id);
  }, [threads, ownedFlows, sharedWithMe, sharedByMe, categoryFilter, statusFilter, actualViewFilter, searchQuery, sortOrder, currentView, flows, selectedAccountFilter]);

  const selectedFlow = useMemo(() => {
    let setToUse: any[] = [];
    if (actualViewFilter === "owned") {
      setToUse = ownedFlows.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (actualViewFilter === "sharedWithMe") {
      setToUse = sharedWithMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (actualViewFilter === "sharedByMe") {
      setToUse = sharedByMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (actualViewFilter === "deleted") {
      setToUse = [...ownedFlows, ...sharedWithMe, ...sharedByMe].filter(f => 
        Array.isArray(f.secondaryTags) && f.secondaryTags.includes('deleted')
      );
    } else {
      setToUse = [];
    }
    return setToUse.find(f => f.flowId === selectedId);
  }, [ownedFlows, sharedWithMe, sharedByMe, selectedId, actualViewFilter]);

  // Polling for new threads
  const pollForNewThreads = async () => {
    if (onRefresh) {
      console.log('🔄 Polling for new threads...');
      try {
        await onRefresh();
      } catch (err) {
        console.error('Error polling for new threads:', err);
      }
    }
  };

  // Start/stop polling based on view and thread count
  useEffect(() => {
    if (currentView === 'inbox') {
      setIsPolling(true);
      lastThreadCountRef.current = filteredThreads.length;
      
      // Poll every 10 seconds for new threads (less frequent than message polling)
      pollingIntervalRef.current = setInterval(pollForNewThreads, 10000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);
      };
    } else {
      // Stop polling when not in inbox view
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
    }
  }, [currentView, onRefresh]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Handle scroll events to show/hide scrollbar
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Show scrollbar immediately
    container.classList.add('scrolling');

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Hide scrollbar after 3000ms of no scrolling (increased for more forgiving UX)
    scrollTimeoutRef.current = setTimeout(() => {
      container.classList.remove('scrolling');
    }, 3000);
  };

  // Handle mouse enter on scroll container
  const handleMouseEnter = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.classList.add('scrolling');
    
    // Clear any existing timeout when hovering
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };

  // Handle mouse move to keep scrollbar visible during interaction
  const handleMouseMove = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.classList.add('scrolling');
    
    // Clear any existing timeout when moving mouse
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  };

  // Handle mouse leave on scroll container
  const handleMouseLeave = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Only hide if not actively scrolling - longer delay for easier scrollbar interaction
    scrollTimeoutRef.current = setTimeout(() => {
      container.classList.remove('scrolling');
    }, 2000);
  };

  // Effects
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Helper functions
  const getPreviewText = (threadId: string): { content: string; isOutgoing: boolean; isEmail: boolean } => {
    const flow = flows.find(f => f.flowId === threadId);
    
    // If we have a real last message, use it
    if (flow?.lastMessage && flow.lastMessage.trim()) {
      const message = flow.lastMessage.trim();
      const isOutgoing = message.startsWith('➤ ');
      const isEmail = message.includes('📧 ');
      
      // Remove direction indicators for clean display
      let cleanMessage = message.replace(/^[➤←] /, '').trim();
      
      // Truncate if needed
      const maxLength = 55;
      if (cleanMessage.length > maxLength) {
        cleanMessage = cleanMessage.substring(0, maxLength) + '...';
      }
      
      return { content: cleanMessage, isOutgoing, isEmail };
    }
    
    // Fallback to subject
    if (flow?.subject && flow.subject.trim()) {
      const cleanSubject = flow.subject.trim();
      const truncated = cleanSubject.length > 55 ? cleanSubject.substring(0, 55) + '...' : cleanSubject;
      return { content: truncated, isOutgoing: false, isEmail: true };
    }
    
    // Default fallback
    return { content: 'No messages yet', isOutgoing: false, isEmail: false };
  };

  const formatEmailAddress = (email: string): string => {
    if (!email) return email;
    

    
    // If email is 20 characters or less, show it as-is
    if (email.length <= 20) {
      return email;
    }
    
    // If longer than 20 chars, truncate and add "..."
    return email;
  };

  const getThreadTitle = (threadId: string): string => {
    const flow = flows.find(f => f.flowId === threadId);
    
    // NEW: Multi-participant email threads - show all participants
    if (flow?.participants && Array.isArray(flow.participants) && flow.participants.length > 1) {
      const uniqueParticipants = [...new Set(flow.participants)];
      const formattedParticipants = uniqueParticipants
        .filter((p): p is string => typeof p === 'string' && p !== userId) // Exclude current user and ensure string type
        .map(p => formatEmailAddress(p))
        .slice(0, 3); // Show max 3 participants
      
      if (formattedParticipants.length > 0) {
        const participantString = formattedParticipants.join(', ');
        const extraCount = uniqueParticipants.length - 1 - formattedParticipants.length;
        return extraCount > 0 ? `${participantString} +${extraCount}` : participantString;
      }
    }
    
    // First priority: Use the new contactIdentifier field
    if (flow?.contactIdentifier) {
      // Handle WhatsApp group chats specially
      if (flow.contactIdentifier.endsWith('@g.us')) {
        // Extract the group ID and format it nicely
        const groupId = flow.contactIdentifier.replace('@g.us', '');
        return `WhatsApp Group (${groupId})`;
      }
      
      const formatted = formatEmailAddress(flow.contactIdentifier);
      return formatted;
    }
    
    // Fallback: Existing contact fields for backward compatibility
    if (flow?.contactEmail) {
      const formatted = formatEmailAddress(flow.contactEmail);
      console.log('ThreadList - Formatting contactEmail:', flow.contactEmail, '→', formatted);
      return formatted;
    }
    if (flow?.fromEmail) {
      const formatted = formatEmailAddress(flow.fromEmail);
      console.log('ThreadList - Formatting fromEmail:', flow.fromEmail, '→', formatted);
      return formatted;
    }
    
    // Fallback to phone number for WhatsApp
    if (flow?.contactPhone) {
      return flow.contactPhone;
    }
    if (flow?.fromPhone) {
      return flow.fromPhone;
    }
    
    // BACKWARD COMPATIBILITY: For old flows where flowId IS the contact identifier
    if (flow?.flowId) {
      // Check if flowId looks like an email or phone number (old structure)
      if (flow.flowId.includes('@') || flow.flowId.startsWith('+')) {
        const formatted = formatEmailAddress(flow.flowId);
        console.log('ThreadList - Using legacy flowId as contact:', flow.flowId, '→', formatted);
        return formatted;
      }
    }
    
    // Final fallbacks - improved for UUID flowIds
    return flow?.contactName || flow?.subject || 'Unknown Contact';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#10b981';
      case 'waiting': return '#f59e0b';
      case 'resolved': return '#6b7280';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Soft delete function - adds 'deleted' to secondary tags
  const handleSoftDelete = async (threadId: string) => {
    try {
      const flow = flows.find(f => f.flowId === threadId);
      if (!flow) {
        console.error('Flow not found:', threadId);
        return;
      }

      const existingSecondaryTags = Array.isArray(flow.secondaryTags) ? flow.secondaryTags : [];
      
      // Add 'deleted' tag if not already present
      if (!existingSecondaryTags.includes('deleted')) {
        const updatedSecondaryTags = [...existingSecondaryTags, 'deleted'];
        
        // Use the same updateFlow pattern as the tag system
        const FUNCTION_URL = API_ENDPOINTS.FLOW_STATUS_UPDATE;
        
        const payload = {
          primaryTag: flow.primaryTag,
          secondaryTags: updatedSecondaryTags,
          userId: userId
        };

        const res = await fetch(`${FUNCTION_URL}/flows/${encodeURIComponent(threadId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || `HTTP ${res.status}`);
        }

        console.log('Successfully soft deleted thread:', threadId);
        // The UI will update when flows are refetched
      }
          } catch (error: any) {
        console.error('Failed to delete thread:', error);
        alert('Failed to delete conversation: ' + error.message);
    }
  };

  // Restore function - removes 'deleted' from secondary tags
  const handleRestore = async (threadId: string) => {
    try {
      const flow = flows.find(f => f.flowId === threadId);
      if (!flow) {
        console.error('Flow not found:', threadId);
        return;
      }

      const existingSecondaryTags = Array.isArray(flow.secondaryTags) ? flow.secondaryTags : [];
      
      // Remove 'deleted' tag if present
      if (existingSecondaryTags.includes('deleted')) {
                 const updatedSecondaryTags = existingSecondaryTags.filter((tag: string) => tag !== 'deleted');
        
        // Use the same updateFlow pattern as the tag system
        const FUNCTION_URL = API_ENDPOINTS.FLOW_STATUS_UPDATE;
        
        const payload = {
          primaryTag: flow.primaryTag,
          secondaryTags: updatedSecondaryTags,
          userId: userId
        };

        const res = await fetch(`${FUNCTION_URL}/flows/${encodeURIComponent(threadId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || `HTTP ${res.status}`);
        }

        console.log('Successfully restored thread:', threadId);
        // The UI will update when flows are refetched
      }
          } catch (error: any) {
        console.error('Failed to restore thread:', error);
        alert('Failed to restore conversation: ' + error.message);
      }
  };

  // Hard delete function (permanent) - actually deletes the flow
  const handleHardDelete = async (threadId: string) => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this conversation? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      // TODO: Implement actual hard delete endpoint
      // This would need a DELETE endpoint instead of just updating tags
      console.log('Hard delete not yet implemented for:', threadId);
      alert('Hard delete feature needs to be implemented with a DELETE API endpoint');
    } catch (error: any) {
      console.error('Failed to permanently delete thread:', error);
      alert('Failed to permanently delete conversation: ' + error.message);
    }
  };

  return (
    <>
      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(222, 23, 133, 0.4);
          border-radius: 3px;
          min-height: 40px;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.2s ease;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb,
        .custom-scrollbar.scrolling::-webkit-scrollbar-thumb {
          opacity: 1;
          background: #DE1785;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(222, 23, 133, 0.8);
        }
        .custom-scrollbar.scrolling::-webkit-scrollbar-thumb:hover {
          background: #C91476;
        }
        .custom-scrollbar {
          scrollbar-width: none;
        }
        .custom-scrollbar.scrolling {
          scrollbar-width: thin;
          scrollbar-color: #DE1785 transparent;
        }
      `}</style>
      
      <div style={{
        
        width: '460px', // Increased width to accommodate both columns
        minWidth: '460px', // Prevent compression
        maxWidth: '460px', // Prevent expansion
        flexShrink: 0, // Prevent flex compression
        height: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'row', // Changed to row for side-by-side layout
        overflow: 'hidden',
        zIndex: 0
      }}>
      {/* Left Column - Categories and Filters */}
      <div style={{
        width: '180px',
        height: '110vh', // Always use full height
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFBFA',
        position: 'relative',
        paddingTop: '20px' // Add top padding to push content down
      }}>

        {/* Compose Button - Moved to top */}
        <div style={{
          padding: '16px'
        }}>
          <button
            onClick={onCompose}
            style={{
              width: '100%',
              padding: '12px',
              background: '#DE1785',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#fff',
              textAlign: 'center',
              transition: 'background 0.18s',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#C91476';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#DE1785';
            }}
          >
            Compose
          </button>
        </div>

        {/* View Filter Sections */}
        <div style={{
          padding: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Inbox Section - Updated with integrated connected accounts */}
            <div>
              <button
                onClick={() => toggleSection('inbox')}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.18s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={16} />
                  Inbox
                </div>
                <span style={{ 
                  fontSize: '12px',
                  transform: expandedSections.inbox ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▶
                </span>
              </button>
              
              {expandedSections.inbox && (
                <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  {/* All Inboxes Option */}
                  <button
                    onClick={() => {
                      setSelectedAccountFilter({ type: 'all' });
                      handleViewFilterChange("owned");
                      onBackToInbox?.();
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: (currentView === 'inbox' && selectedAccountFilter.type === 'all' && actualViewFilter === "owned") ? "#EAE5E5" : "transparent",
                      border: "1px solid transparent",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                      textAlign: "left",
                      transition: "background 0.18s",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none"
                    }}
                    onMouseEnter={(e) => {
                      if (!(currentView === 'inbox' && selectedAccountFilter.type === 'all' && actualViewFilter === "owned")) {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(currentView === 'inbox' && selectedAccountFilter.type === 'all' && actualViewFilter === "owned")) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>📥</span>
                    <span style={{ fontWeight: '600' }}>All Inboxes</span>
                  </button>

                  {/* Connected Accounts */}
                  {connectionsLoading && (
                    <div style={{ 
                      padding: '8px 12px', 
                      fontSize: '12px', 
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      Loading accounts...
                    </div>
                  )}
                  
                  {connectionsError && (
                    <div style={{ 
                      padding: '8px 12px', 
                      fontSize: '12px', 
                      color: '#ef4444',
                      textAlign: 'center'
                    }}>
                      Failed to load accounts
                    </div>
                  )}
                  
                  {userConnections && !connectionsLoading && !connectionsError && (
                    <>
                      {/* Gmail Accounts */}
                      {userConnections.gmail.connected && userConnections.gmail.accounts.map((account, index) => (
                        <button
                          key={`gmail-${index}`}
                          onClick={() => {
                            setSelectedAccountFilter({
                              type: 'gmail',
                              accountId: account.id,
                              accountEmail: account.email
                            });
                            handleViewFilterChange("owned");
                            onBackToInbox?.();
                            console.log('📧 Filtering by Gmail account:', account.email);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: (currentView === 'inbox' && selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountEmail === account.email) ? "#EAE5E5" : "transparent",
                            border: "1px solid transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                            textAlign: "left",
                            transition: "background 0.18s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "2px",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none"
                          }}
                          onMouseEnter={(e) => {
                            if (!(currentView === 'inbox' && selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountEmail === account.email)) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(currentView === 'inbox' && selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountEmail === account.email)) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <img 
                            src="/assets/icons/gmail-logo.png" 
                            alt="Gmail" 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              objectFit: 'contain' 
                            }} 
                          />
                          <span style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {connectionsService.getAccountDisplayName(account)}
                          </span>
                        </button>
                      ))}
                      
                      {/* Fallback Gmail Account using user's subscriber_email */}
                      {!userConnections.gmail.connected && user?.subscriber_email && (
                        <button
                          onClick={() => {
                            console.log('🔥 GMAIL BUTTON CLICKED! Showing all email conversations');
                            
                            const newFilter = {
                              type: 'gmail' as const,
                              accountId: 'primary-gmail',
                              accountEmail: 'SHOW_ALL_EMAILS' // Special value to show all emails
                            };
                            
                            console.log('🔥 Setting new filter:', newFilter);
                            setSelectedAccountFilter(newFilter);
                            
                            handleViewFilterChange("owned");
                            onBackToInbox?.();
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: (currentView === 'inbox' && selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountId === 'primary-gmail') ? "#EAE5E5" : "transparent",
                            border: "1px solid transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                            textAlign: "left",
                            transition: "background 0.18s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "2px",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none"
                          }}
                          onMouseEnter={(e) => {
                            if (!(currentView === 'inbox' && selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountId === 'primary-gmail')) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(currentView === 'inbox' && selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountId === 'primary-gmail')) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <img 
                            src="/assets/icons/gmail-logo.png" 
                            alt="Gmail" 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              objectFit: 'contain' 
                            }} 
                          />
                          <span style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            Gmail (All)
                          </span>
                        </button>
                      )}
                      
                      {/* WhatsApp Accounts */}
                      {userConnections.whatsapp.connected && userConnections.whatsapp.accounts.map((account, index) => (
                        <button
                          key={`whatsapp-${index}`}
                          onClick={() => {
                            console.log('🔥 WHATSAPP BUTTON CLICKED! Setting filter to:', account.name);
                            setSelectedAccountFilter({
                              type: 'whatsapp',
                              accountId: account.id
                            });
                            handleViewFilterChange("owned");
                            onBackToInbox?.();
                            console.log('📱 WhatsApp filter state updated:', { 
                              type: 'whatsapp', 
                              accountId: account.id 
                            });
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: (currentView === 'inbox' && selectedAccountFilter.type === 'whatsapp' && selectedAccountFilter.accountId === account.id) ? "#EAE5E5" : "transparent",
                            border: "1px solid transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                            textAlign: "left",
                            transition: "background 0.18s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "2px",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            MozUserSelect: "none",
                            msUserSelect: "none"
                          }}
                          onMouseEnter={(e) => {
                            if (!(currentView === 'inbox' && selectedAccountFilter.type === 'whatsapp' && selectedAccountFilter.accountId === account.id)) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(currentView === 'inbox' && selectedAccountFilter.type === 'whatsapp' && selectedAccountFilter.accountId === account.id)) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <img 
                            src="/assets/icons/whatsapp-logo.png" 
                            alt="WhatsApp" 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              objectFit: 'contain' 
                            }} 
                          />
                          <span style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {connectionsService.getAccountDisplayName(account)}
                          </span>
                        </button>
                      ))}
                      
                      {/* No connections message */}
                      {!userConnections.gmail.connected && !userConnections.whatsapp.connected && (
                        <div style={{ 
                          padding: '8px 12px', 
                          fontSize: '12px', 
                          color: '#6b7280',
                          textAlign: 'center'
                        }}>
                          No connected accounts
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Discussions Section */}
            <div>
              <button
                onClick={onDiscussionsClick}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: currentView === 'discussions' ? "#EAE5E5" : "transparent",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.18s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none"
                }}
                onMouseEnter={(e) => {
                  if (currentView !== 'discussions') {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = currentView === 'discussions' ? "#EAE5E5" : "transparent";
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageCircle size={16} />
                  Discussions
                </div>
              </button>
            </div>

            {/* Shared With Me Section */}
            <div>
              <button
                onClick={() => {
                  onBackToInbox?.();
                  handleViewFilterChange("sharedWithMe");
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: (currentView === 'inbox' && actualViewFilter === "sharedWithMe") ? "#EAE5E5" : "transparent",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  transition: "background 0.18s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none"
                }}
                onMouseEnter={(e) => {
                  if (!(currentView === 'inbox' && actualViewFilter === "sharedWithMe")) {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = (currentView === 'inbox' && actualViewFilter === "sharedWithMe") ? "#EAE5E5" : "transparent";
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} />
                  Shared with me
                </div>
              </button>
            </div>

            {/* Shared By Me Section */}
            <div>
              <button
                onClick={() => {
                  onBackToInbox?.();
                  handleViewFilterChange("sharedByMe");
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: (currentView === 'inbox' && actualViewFilter === "sharedByMe") ? "#EAE5E5" : "transparent",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  transition: "background 0.18s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none"
                }}
                onMouseEnter={(e) => {
                  if (!(currentView === 'inbox' && actualViewFilter === "sharedByMe")) {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = (currentView === 'inbox' && actualViewFilter === "sharedByMe") ? "#EAE5E5" : "transparent";
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={16} />
                  Shared By Me ({sharedByMe.length})
                </div>
              </button>
            </div>

            {/* Deleted Section */}
            <div>
              <button
                onClick={() => {
                  onBackToInbox?.();
                  handleViewFilterChange("deleted");
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: (currentView === 'inbox' && actualViewFilter === "deleted") ? "#EAE5E5" : "transparent",
                  border: "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#6b7280",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  transition: "background 0.18s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none"
                }}
                onMouseEnter={(e) => {
                  if (!(currentView === 'inbox' && actualViewFilter === "deleted")) {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = (currentView === 'inbox' && actualViewFilter === "deleted") ? "#EAE5E5" : "transparent";
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={16} />
                  Deleted
                </div>
              </button>
            </div>
          </div>


        </div>


      </div>

      {/* Right Column - Thread List */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '300vh',
        paddingTop: '60px' // Space for status bar without affecting height calculation
      }}>
        {/* Thread List Header */}
        <div style={{
          padding: '10px',
          paddingTop: '20px', // Add extra top padding for spacing from status bar
          background: '#FBF7F7' // Match the thread list container background
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                {/* Search Button */}
                <button
                  onClick={() => {
                    setShowSearchInput(!showSearchInput);
                    if (showSearchInput) {
                      setSearchQuery('');
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#6b7280',
                    transition: 'all 0.18s'
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  Search
                </button>

                {/* Sort Toggle Button - Centered */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
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
                  <span style={{ fontSize: '14px' }}>
                    {sortOrder === 'newest' ? '↓' : '↑'}
                  </span>
                  {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                </button>
                {/* Tag Filter Dropdown */}
                <div style={{ position: 'relative' }} ref={tagDropdownRef}>
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                style={{
                  padding: "8px 12px",
                  background: categoryFilter.length > 0 ? "#f3f4f6" : "transparent",
                  border: categoryFilter.length > 0 ? "1px solid #de1785" : "1px solid #e5e7eb",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: categoryFilter.length > 0 ? "#de1785" : "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.18s"
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
                </svg>
                Filter
                {categoryFilter.length > 0 && (
                  <span style={{
                    background: '#de1785',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {categoryFilter.length}
                  </span>
                )}
              </button>

              {showTagDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '150px'
                }}>
                  <div style={{ padding: '8px' }}>
                    <input
                      type="text"
                      placeholder="Search tags..."
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  
                  {categoryFilterOptions
                    .filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (onCategoryFilterChange) {
                            if (tag === 'all') {
                              onCategoryFilterChange([]);
                            } else {
                              const isSelected = categoryFilter.includes(tag);
                              if (isSelected) {
                                // Remove tag from selection
                                onCategoryFilterChange(categoryFilter.filter(t => t !== tag));
                              } else {
                                // Add tag to selection
                                onCategoryFilterChange([...categoryFilter, tag]);
                              }
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: (tag === 'all' && categoryFilter.length === 0) || categoryFilter.includes(tag) ? '#f3f4f6' : 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: '12px',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          if (!((tag === 'all' && categoryFilter.length === 0) || categoryFilter.includes(tag))) {
                            e.currentTarget.style.background = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!((tag === 'all' && categoryFilter.length === 0) || categoryFilter.includes(tag))) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span>{tag === 'all' ? 'All Tags' : tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                          {((tag === 'all' && categoryFilter.length === 0) || categoryFilter.includes(tag)) && (
                            <span style={{ color: '#de1785', fontWeight: 'bold' }}>✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Search Input */}
          {showSearchInput && (
            <div style={{
              padding: '10px 0 16px 0',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    zIndex: 1,
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search threads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.18s, box-shadow 0.18s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 1px #3b82f6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Thread List */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#FBF7F7', // Light background for the container
            padding: '8px', // Add padding around the thread items
          }}
          className="custom-scrollbar"
        >
          {filteredThreads.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No conversations found
            </div>
          ) : (
            filteredThreads.map(threadId => {
              const flow = flows.find(f => f.flowId === threadId);
              const isSelected = threadId === selectedId;
              const previewData = getPreviewText(threadId);
              
              return (
                <div
                  key={threadId}
                  onClick={() => onSelect(threadId)}
                  style={{
                    padding: '16px',
                    marginBottom: '8px', // Add space between thread items
                    cursor: 'pointer',
                    background: isSelected ? '#FFF4FA' : '#FFFBFA', // Different backgrounds for selected vs normal threads
                    borderRadius: isSelected ? '12px' : '8px', // Full border radius, larger when selected
                    border: isSelected ? '2px solid #de1785' : '1px solid #e5e7eb', // Full border instead of just left
                    boxShadow: isSelected 
                      ? '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' // Stronger shadow when selected
                      : '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)', // Subtle shadow for all items
                    transition: 'all 0.2s ease-in-out', // Smooth transitions for all properties
                    transform: isSelected ? 'translateY(-1px)' : 'translateY(0)', // Slight lift when selected
                    minHeight: '120px', // Fixed minimum height to ensure consistent sizing
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between', // Distribute content evenly
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {/* Top section - Header with title and status */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      {/* Unread indicator */}
                      {flow?.hasUnreadMessages && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#DE1785',
                          flexShrink: 0
                        }} />
                      )}
                      
                      <h4 style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: flow?.hasUnreadMessages ? '700' : '600',
                        color: flow?.hasUnreadMessages ? '#111827' : '#374151',
                        lineHeight: '1.2',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        fontFamily: 'AEONIK TRIAL, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}>
                        {getThreadTitle(threadId)}
                      </h4>
                      
                      {/* Unread count badge */}
                      {flow?.unreadCount > 0 && (
                        <div style={{
                          minWidth: '18px',
                          height: '18px',
                          borderRadius: '9px',
                          background: '#DE1785',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          padding: '0 4px'
                        }}>
                          {flow.unreadCount > 99 ? '99+' : flow.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    {flow?.status && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getStatusColor(flow.status),
                        flexShrink: 0,
                        marginLeft: '8px'
                      }} />
                    )}
                  </div>
                  
                  {/* Middle section - Content that can expand */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {/* Direction indicator */}
                      <span style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        fontFamily: 'AEONIK TRIAL, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}>
                        {previewData.isOutgoing ? 'OUTGOING' : 'INCOMING'}
                      </span>
                    </div>
                    
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#6b7280',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {previewData.content}
                    </p>
                  </div>
                  
                  {/* Bottom section - Tags */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {/* Primary tag */}
                    {flow?.primaryTag && (
                      <div style={{
                        fontSize: '10px',
                        color: '#DE1785',
                        background: '#FDE7F1',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        display: 'inline-block',
                        fontWeight: '500'
                      }}>
                        {flow.primaryTag}
                      </div>
                    )}
                    
                    {/* Secondary tags */}
                    {Array.isArray(flow?.secondaryTags) && flow.secondaryTags.slice(0, 3).map((tag: string, index: number) => {
                      // Color mapping for different secondary tags
                      const getTagColors = (tagName: string) => {
                        const tagColors = {
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
                      
                      const colors = getTagColors(tag);
                      
                      return (
                      <div key={index} style={{
                        fontSize: '10px',
                          color: colors.color,
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        display: 'inline-block'
                      }}>
                        {tag}
                      </div>
                      );
                    })}
                    
                    {/* Show +X more if there are more than 3 secondary tags */}
                    {Array.isArray(flow?.secondaryTags) && flow.secondaryTags.length > 3 && (
                      <div style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        background: '#f3f4f6',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        display: 'inline-block'
                      }}>
                        +{flow.secondaryTags.length - 3}
                      </div>
                    )}
                    
                    {/* Legacy support - show old category if no primary tag exists */}
                    {!flow?.primaryTag && flow?.category && (
                      <div style={{
                        fontSize: '10px',
                        color: '#DE1785',
                        background: '#FDE7F1',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        display: 'inline-block',
                        fontWeight: '500'
                      }}>
                        {flow.category}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default ThreadList; 