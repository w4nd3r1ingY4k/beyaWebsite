import React, { useState, useRef, useEffect, useMemo } from 'react';

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
  onCompose
}) => {
  // State
  const [viewFilter, setViewFilter] = useState<'owned' | 'sharedWithMe' | 'sharedByMe' | 'deleted'>('owned');
  // Use external filters instead of internal state
  const categoryFilter = externalCategoryFilter;
  const statusFilter = externalStatusFilter;
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
    deleted: false
  });

  // Refs
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

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
    let baseFlows: any[] = [];
    if (viewFilter === "owned") {
      baseFlows = ownedFlows.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (viewFilter === "sharedWithMe") {
      baseFlows = sharedWithMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (viewFilter === "sharedByMe") {
      baseFlows = sharedByMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (viewFilter === "deleted") {
      // Show only items with 'deleted' tag from all flows the user has access to
      baseFlows = [...ownedFlows, ...sharedWithMe, ...sharedByMe].filter(f => 
        Array.isArray(f.secondaryTags) && f.secondaryTags.includes('deleted')
      );
    } else {
      baseFlows = [];
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
  }, [threads, ownedFlows, sharedWithMe, sharedByMe, categoryFilter, statusFilter, viewFilter, searchQuery, sortOrder]);

  const selectedFlow = useMemo(() => {
    let setToUse: any[] = [];
    if (viewFilter === "owned") {
      setToUse = ownedFlows.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (viewFilter === "sharedWithMe") {
      setToUse = sharedWithMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (viewFilter === "sharedByMe") {
      setToUse = sharedByMe.filter(f => !Array.isArray(f.secondaryTags) || !f.secondaryTags.includes('deleted'));
    } else if (viewFilter === "deleted") {
      setToUse = [...ownedFlows, ...sharedWithMe, ...sharedByMe].filter(f => 
        Array.isArray(f.secondaryTags) && f.secondaryTags.includes('deleted')
      );
    } else {
      setToUse = [];
    }
    return setToUse.find(f => f.flowId === selectedId);
  }, [ownedFlows, sharedWithMe, sharedByMe, selectedId, viewFilter]);

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
  const getPreviewText = (threadId: string): string => {
    const flow = flows.find(f => f.flowId === threadId);
    return flow?.lastMessage || flow?.subject || '';
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
    
    // Prioritize showing email addresses (formatted)
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
    
    // Final fallbacks
    return flow?.contactName || flow?.subject || `${threadId.slice(0, 30)}`;
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
        height: 'calc(100vh - 65px)', // Subtract the header space to prevent cropping
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFBFA'
      }}>
        {/* Compose Button - Moved to top */}
        <div style={{
          padding: '16px 16px 0 16px'
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
            {/* Inbox Section */}
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
                  📧 Inbox
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
                  <button
                    onClick={() => setViewFilter("owned")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: viewFilter === "owned" ? "#EAE5E5" : "transparent",
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
                    All Messages
                  </button>
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
                  👥 Shared with me
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
                    onClick={() => setViewFilter("sharedWithMe")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: viewFilter === "sharedWithMe" ? "#EAE5E5" : "transparent",
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
                  📤 Shared by me
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
                    onClick={() => setViewFilter("sharedByMe")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: viewFilter === "sharedByMe" ? "#EAE5E5" : "transparent",
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
                    My Shared Items
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
                  🗑️ Deleted
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
                    onClick={() => setViewFilter("deleted")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: viewFilter === "deleted" ? "#EAE5E5" : "transparent",
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
        </div>


      </div>

      {/* Right Column - Thread List */}
      <div style={{
        flex: 1,
        height: selectedId ? 'calc(100vh - 145px)' : 'calc(100vh - 65px)', // Adjust height when status bar is visible (extra 20px buffer)
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '300vh',
        marginTop: selectedId ? '60px' : '0' // Only push down the thread list, not the left sidebar
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
                    {getPreviewText(threadId)}
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