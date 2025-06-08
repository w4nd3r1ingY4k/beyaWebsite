import React, { useState, useRef, useEffect, useMemo } from 'react';

type Status = 'open' | 'waiting' | 'resolved' | 'overdue';
type ViewFilter = "owned" | "sharedWithMe" | "sharedByMe";

interface Props {
  threads: string[];
  flows: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userId: string;
  statusFilter?: Status | 'all';
  categoryFilter?: string;
  onCategoryFilterChange?: (category: string) => void;
  onCompose?: () => void;
}

const ThreadList: React.FC<Props> = ({ 
  threads, 
  flows, 
  selectedId, 
  onSelect, 
  userId,
  statusFilter: externalStatusFilter = 'all',
  categoryFilter: externalCategoryFilter = 'all',
  onCategoryFilterChange,
  onCompose
}) => {
  // State
  const [viewFilter, setViewFilter] = useState<ViewFilter>("owned");
  // Use external filters instead of internal state
  const categoryFilter = externalCategoryFilter;
  const statusFilter = externalStatusFilter;
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Refs
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Derived data
  const ownedFlows = useMemo(() => {
    return Array.isArray(flows) ? flows.filter(f => f.contactId === userId) : [];
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
      if (f.category) {
        options.add(f.category.toLowerCase());
      }
    });
    return Array.from(options).sort();
  }, [ownedFlows]);

  const filteredThreads = useMemo(() => {
    let baseFlows: any[] = [];
    if (viewFilter === "owned") {
      baseFlows = ownedFlows;
    } else if (viewFilter === "sharedWithMe") {
      baseFlows = sharedWithMe;
    } else {
      baseFlows = sharedByMe;
    }
  
    const baseFlowIds = new Set(baseFlows.map(f => f.flowId));
    let result = threads.filter(id => baseFlowIds.has(id));
  
    if (categoryFilter !== "all") {
      const matching = new Set(
        baseFlows
          .filter(f =>
            typeof f.category === "string" &&
            f.category.toLowerCase() === categoryFilter.toLowerCase()
          )
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
      setToUse = ownedFlows;
    } else if (viewFilter === "sharedWithMe") {
      setToUse = sharedWithMe;
    } else {
      setToUse = sharedByMe;
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
    return flow?.lastMessage || flow?.subject || 'No messages yet';
  };

  const getThreadTitle = (threadId: string): string => {
    const flow = flows.find(f => f.flowId === threadId);
    return flow?.subject || flow?.contactName || `Thread ${threadId.slice(0, 8)}`;
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

  return (
    <div style={{
      width: '460px', // Increased width to accommodate both columns
      minWidth: '460px', // Prevent compression
      maxWidth: '460px', // Prevent expansion
      flexShrink: 0, // Prevent flex compression
      height: '100vh',
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
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
        background: '#f9fafb'
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

        {/* View Filter Buttons */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => {
                setViewFilter("owned");
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: viewFilter === "owned" ? "#EAE5E5" : "transparent",
                border: "1px solid transparent",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#374151",
                textAlign: "left",
                transition: "background 0.18s",
              }}
            >
              Inbox
            </button>

            <button
              onClick={() => {
                setViewFilter("sharedWithMe");
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: viewFilter === "sharedWithMe" ? "#EAE5E5" : "transparent",
                border: "1px solid transparent",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#374151",
                textAlign: "left",
                transition: "background 0.18s",
              }}
            >
              Shared With Me
            </button>

            <button
              onClick={() => {
                setViewFilter("sharedByMe");
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: viewFilter === "sharedByMe" ? "#EAE5E5" : "transparent",
                border: "1px solid transparent",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#374151",
                textAlign: "left",
                transition: "background 0.18s",
              }}
            >
              Shared By Me
            </button>
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
          background: '#fff'
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
                <span style={{ fontSize: '14px' }}>🏷️</span>
                Filter
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
                          setShowTagDropdown(false);
                          setTagSearch('');
                          if (onCategoryFilterChange) {
                            onCategoryFilterChange(tag);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: categoryFilter === tag ? '#f3f4f6' : 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: '12px',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          if (categoryFilter !== tag) {
                            e.currentTarget.style.background = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (categoryFilter !== tag) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {tag === 'all' ? 'All Tags' : tag.charAt(0).toUpperCase() + tag.slice(1)}
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
          overflowY: 'auto'
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
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: isSelected ? '#f9fafb' : 'transparent',
                    borderLeft: isSelected ? '3px solid #de1785' : '3px solid transparent',
                    transition: 'background 0.15s'
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
                      lineHeight: '1.2'
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
                  
                  {flow?.category && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '10px',
                      color: '#8b5cf6',
                      background: '#f3f0ff',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      display: 'inline-block'
                    }}>
                      {flow.category}
                    </div>
                  )}
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