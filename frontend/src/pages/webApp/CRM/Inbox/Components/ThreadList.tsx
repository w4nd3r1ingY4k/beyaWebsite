import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Inbox, Users, Send, Trash2 } from 'lucide-react';
import { connectionsService, ConnectionsResponse, UserConnections } from '../../../../../connectionsService';
import { useAuth } from '../../../../AuthContext';

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
        fromEmail: f.fromEmail
      })));
      
      baseFlows = baseFlows.filter(f => {
        if (selectedAccountFilter.type === 'gmail') {
          // Filter for Gmail messages - check various email fields
          const flowEmail = f.contactIdentifier || f.contactEmail || f.fromEmail;
          
          // DEBUG: Log the flow data for Gmail filtering
          console.log('🔍 Gmail filter check for flow:', {
            flowId: f.flowId,
            contactIdentifier: f.contactIdentifier,
            contactEmail: f.contactEmail,
            fromEmail: f.fromEmail,
            combinedFlowEmail: flowEmail,
            selectedAccountEmail: selectedAccountFilter.accountEmail,
            isLegacyEmailFlow: f.flowId && f.flowId.includes('@')
          });
          
          if (selectedAccountFilter.accountEmail && selectedAccountFilter.accountEmail !== 'SHOW_ALL_EMAILS') {
            // Check direct match for specific email
            if (flowEmail === selectedAccountFilter.accountEmail) {
              console.log('✅ Direct email match:', flowEmail);
              return true;
            }
            // BACKWARD COMPATIBILITY: Check if flowId itself is the email
            if (f.flowId && f.flowId.includes('@') && f.flowId === selectedAccountFilter.accountEmail) {
              console.log('✅ Legacy flowId email match:', f.flowId);
              return true;
            }
            console.log('❌ No email match for flow:', f.flowId);
            return false;
          }
          
          // Show ALL emails - check if it's any email (contains @)
          const isEmailFlow = (flowEmail && flowEmail.includes('@')) || (f.flowId && f.flowId.includes('@'));
          console.log('🔍 Show all emails check:', { flowId: f.flowId, isEmailFlow, flowEmail, isLegacyEmail: f.flowId && f.flowId.includes('@') });
          
          if (isEmailFlow) {
            console.log('✅ Email flow found:', f.flowId);
            return true;
          }
          
          console.log('❌ Not an email flow:', f.flowId);
          return false;
        } else if (selectedAccountFilter.type === 'whatsapp') {
          // Filter for WhatsApp messages - check phone fields INCLUDING contactIdentifier
          const flowPhone = f.contactIdentifier || f.contactPhone || f.fromPhone;
          if (flowPhone && (flowPhone.startsWith('+') || /^\d+$/.test(flowPhone))) {
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
    
    // Log full email for debugging
    if (email.length > 20) {
      console.log('🔍 Full email being truncated:', email);
    }
    
    // If email is 20 characters or less, show it as-is
    if (email.length <= 20) {
      return email;
    }
    
    // If longer than 20 chars, truncate and add "..."
    return email;
  };

  const getThreadTitle = (threadId: string): string => {
    const flow = flows.find(f => f.flowId === threadId);
    
    // First priority: Use the new contactIdentifier field
    if (flow?.contactIdentifier) {
      const formatted = formatEmailAddress(flow.contactIdentifier);
      console.log('ThreadList - Using contactIdentifier:', flow.contactIdentifier, '→', formatted);
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
        const FUNCTION_URL = 'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws';
        
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
        const FUNCTION_URL = 'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws';
        
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
        position: 'relative'
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
                      background: selectedAccountFilter.type === 'all' && actualViewFilter === "owned" ? "#EAE5E5" : "transparent",
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
                      marginBottom: "2px"
                    }}
                    onMouseEnter={(e) => {
                      if (!(selectedAccountFilter.type === 'all' && actualViewFilter === "owned")) {
                        e.currentTarget.style.background = "#f9fafb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(selectedAccountFilter.type === 'all' && actualViewFilter === "owned")) {
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
                            background: selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountEmail === account.email ? "#EAE5E5" : "transparent",
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
                            marginBottom: "2px"
                          }}
                          onMouseEnter={(e) => {
                            if (!(selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountEmail === account.email)) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountEmail === account.email)) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>📧</span>
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
                            background: selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountId === 'primary-gmail' ? "#EAE5E5" : "transparent",
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
                            marginBottom: "2px"
                          }}
                          onMouseEnter={(e) => {
                            if (!(selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountId === 'primary-gmail')) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(selectedAccountFilter.type === 'gmail' && selectedAccountFilter.accountId === 'primary-gmail')) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>📧</span>
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
                            background: selectedAccountFilter.type === 'whatsapp' && selectedAccountFilter.accountId === account.id ? "#EAE5E5" : "transparent",
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
                            marginBottom: "2px"
                          }}
                          onMouseEnter={(e) => {
                            if (!(selectedAccountFilter.type === 'whatsapp' && selectedAccountFilter.accountId === account.id)) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(selectedAccountFilter.type === 'whatsapp' && selectedAccountFilter.accountId === account.id)) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>📱</span>
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

            {/* Shared With Me Section */}
            <div>
              <button
                onClick={() => toggleSection('shared')}
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
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} />
                  Shared with me
                </div>
                <span style={{ 
                  fontSize: '12px',
                  transform: expandedSections.shared ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▶
                </span>
              </button>
              
              {expandedSections.shared && (
                <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      handleViewFilterChange("sharedWithMe");
                      onBackToInbox?.();
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: actualViewFilter === "sharedWithMe" ? "#EAE5E5" : "transparent",
                      border: "1px solid transparent",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                      textAlign: "left",
                      transition: "background 0.18s",
                    }}
                  >
                    Shared Conversations
                  </button>
                </div>
              )}
            </div>

            {/* Shared By Me Section */}
            <div>
              <button
                onClick={() => toggleSection('sharedByMe')}
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
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={16} />
                  Shared By Me ({sharedByMe.length})
                </div>
                <span style={{ 
                  fontSize: '12px',
                  transform: expandedSections.sharedByMe ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▶
                </span>
              </button>
              
              {expandedSections.sharedByMe && (
                <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleViewFilterChange("sharedByMe")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: actualViewFilter === "sharedByMe" ? "#EAE5E5" : "transparent",
                      border: "1px solid transparent",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                      textAlign: "left",
                      transition: "background 0.18s",
                    }}
                  >
                    All Shared By Me
                  </button>
                </div>
              )}
            </div>

            {/* Deleted Section */}
            <div>
              <button
                onClick={() => toggleSection('deleted')}
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
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={16} />
                  Deleted
                </div>
                <span style={{ 
                  fontSize: '12px',
                  transform: expandedSections.deleted ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▶
                </span>
              </button>
              
              {expandedSections.deleted && (
                <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleViewFilterChange("deleted")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: actualViewFilter === "deleted" ? "#EAE5E5" : "transparent",
                      border: "1px solid transparent",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                      textAlign: "left",
                      transition: "background 0.18s",
                    }}
                  >
                    Deleted Items
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Discussions Section */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={onDiscussionsClick}
              style={{
                width: "100%",
                padding: "12px",
                background: "#f8f9fa",
                border: "2px solid #DE1785",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                color: "#DE1785",
                textAlign: "center",
                transition: "all 0.18s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#DE1785";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f8f9fa";
                e.currentTarget.style.color = "#DE1785";
              }}
            >
              💬 Discussions
            </button>
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
          background: '#FBF7F7' // Match the thread list container background
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
                      }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Search Button */}
                <button
                  onClick={() => {
                    setShowSearchInput(!showSearchInput);
                    if (showSearchInput) {
                      setSearchQuery('');
                    }
                  }}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.18s'
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </button>

                {/* Sort Toggle Button */}
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
                <span style={{ fontSize: '14px' }}>🏷️</span>
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
                <span style={{ fontSize: '10px' }}>
                  {showTagDropdown ? '▼' : '▶'}
                </span>
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
          </div>

          {/* Collapsible Search Input */}
          {showSearchInput && (
            <div style={{
              padding: '0 16px 16px 16px',
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
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: '#FBF7F7', // Light background for the container
          padding: '8px' // Add padding around the thread items
        }}>
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
                      lineHeight: '1.2',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '200px' // Ensure there's space for the status dot
                    }}>
                      {getThreadTitle(threadId)}
                    </h4>
                    
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
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    {/* Direction indicator */}
                    <span style={{
                      fontSize: '10px',
                      color: previewData.isOutgoing ? '#10b981' : '#6b7280',
                      fontWeight: '500'
                    }}>
                      {previewData.isOutgoing ? '➤' : '←'}
                    </span>
                    
                    {/* Channel indicator */}
                    {previewData.isEmail && (
                      <span style={{
                        fontSize: '10px',
                        color: '#6b7280'
                      }}>
                        📧
                      </span>
                    )}
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
                  
                  <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                    {Array.isArray(flow?.secondaryTags) && flow.secondaryTags.slice(0, 3).map((tag: string, index: number) => (
                      <div key={index} style={{
                        fontSize: '10px',
                        color: '#DE1785',
                        background: '#FDE7F1',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        display: 'inline-block'
                      }}>
                        {tag}
                      </div>
                    ))}
                    
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
  );
};

export default ThreadList; 