// src/ContactsCRM.tsx
import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
  } from 'react';
  
  // ─────────── Constants ───────────
  const API_BASE = 'https://4enjn4ruh9.execute-api.us-east-1.amazonaws.com/prod';
  const PAGE_SIZE = 50; // exactly 50 contacts per “page”
  
  // ─────────── Types and Interfaces ───────────
  interface Contact {
    contactId: string;
    ownerId: string; // Required for 'my' and 'shared' filters
    firstName: string;
    lastName: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
    status: 'active' | 'inactive' | 'on hold' | 'archived'; // Specific string literals
    notes?: string;
    createdAt: string; // Must be a valid date string
    lastActivityAt: string; // Must be a valid date string
    participants: string[];
    linkedFlowIds: string[];
  }
  
  // This matches your Lambda's JSON shape exactly:
  interface ContactsResponse {
    contacts: any[]; // “raw” objects, with uppercase keys
    lastKey: string | null;
  }
  
  type ViewFilter = 'all' | 'my' | 'sharedWithMe' | 'sharedByMe';
  
  const ContactsCRM: React.FC = () => {
    // ─────────── Mock Auth Context ───────────
    const user = {
      userId: 'user123', // This will be used to check 'my' contacts
      displayName: 'John Doe',
      email: 'john@example.com',
    };
  
    // ─────────── Component State ───────────
    // Holds *all* loaded Contact[] objects (after mapping from the “raw” API JSON)
    const [contacts, setContacts] = useState<Contact[]>([]);
  
    // For DynamoDB pagination:
    const [lastKey, setLastKey] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingPages, setLoadingPages] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
  
    // ─────────── Pagination State ───────────
    const [currentPage, setCurrentPage] = useState(1);
  
    // ─────────── Filtering / Sorting State ───────────
    const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on hold' | 'archived'>('all'); // Added all valid statuses
  
    const [sortField, setSortField] = useState<
      'firstName' | 'lastActivityAt' | 'createdAt' | 'company' | 'email' | 'status' | 'category'
    >('lastActivityAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
    // ─────────── Other UI State ───────────
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
  
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      category: '',
      status: 'active' as Contact['status'],
      notes: '',
    });
  
    const [visibleColumns, setVisibleColumns] = useState({
      firstName: true,
      company: true,
      email: true,
      phone: true,
      category: true,
      status: true,
      lastActivity: true,
      notes: true,
    });
  
    // ─────────── 1) Fetch One Page of Contacts (and map uppercase→lowercase) ───────────
    const fetchContactsPage = useCallback(
        async (startKey?: string) => {
          if (loadingPages) return;
          setLoadingPages(true);
          setFetchError(null);
    
          try {
            let url = `${API_BASE}/contacts?limit=${PAGE_SIZE}`;
            if (startKey) {
              url += `&startKey=${encodeURIComponent(startKey)}`;
            }
    
            const res = await fetch(url);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
    
            const data = (await res.json()) as ContactsResponse;
    
            // Helper function to safely get values from raw data, handling missing/null/empty strings
            const getSafeValue = (raw: any, keys: string[], defaultValue: any = '') => {
                for (const key of keys) {
                    // IMPORTANT: Exact match for keys, including potential hidden characters like \r\n
                    const value = raw[key];
                    if (value !== undefined && value !== null && value !== '') {
                        // Special handling for phone numbers that might be empty strings in your data
                        if (key.includes('PHONE') && value === '') return defaultValue;
                        return value;
                    }
                }
                return defaultValue;
            };
    
            // ─── Map each “raw” item (uppercase keys) → Contact (lowercase keys) ───
            const pageOfContacts: Contact[] = data.contacts.map((raw: any) => {
                // Log raw data to inspect the exact keys and values
                // console.log("Raw contact item:", raw); // Uncomment for debugging if needed
    
                // Handle date strings, converting "NoSales" or invalid dates to a default
                const rawLastOrderDate = getSafeValue(raw, ['LAST_ORDER_DATE', 'LAST_ORDER_DATE_1']);
                const lastActivityDateString = (rawLastOrderDate && rawLastOrderDate !== 'NoSales' && !isNaN(new Date(rawLastOrderDate).getTime()))
                                              ? new Date(rawLastOrderDate).toISOString()
                                              : new Date(0).toISOString(); // Default to Unix epoch for invalid dates
    
                const createdAtDateString = new Date(0).toISOString(); // No 'CREATED_AT' found, default to epoch
    
                const mappedContact: Contact = {
                    contactId: getSafeValue(raw, ['GoldenContactID'], `gen_id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                    ownerId: getSafeValue(raw, ['OWNER_ID'], user.userId),
                    firstName: getSafeValue(raw, ['FIRST_NAME']),
                    lastName: getSafeValue(raw, ['LAST_NAME']),
                    company: getSafeValue(raw, ['Default.company', 'COMPANY']),
                    email: getSafeValue(raw, ['PRIMARY_EMAIL', 'EMAIL_1']),
                    phone: getSafeValue(raw, ['PHONE1_1', 'PHONE1_2', 'PHONE1_3', 'PHONE1_4', 'PHONE1_5', 'BILLING\r\n_PRIMARY_PHONE']),
                    address: getSafeValue(raw, [
                      'SHIPPING_ADDRESS_(ORDER_ADDRESS)',
                      'BILLING\r\n_PRIMARY_ADDRESS\r\n__(Updated_with_proper_format)',
                    ]),
                    category: (getSafeValue(raw, ['CATEGORY'], 'lead') as string).toLowerCase(),
                    status: (getSafeValue(raw, ['STATUS'], 'active') as string).toLowerCase() as Contact['status'],
                    notes: getSafeValue(raw, ['NOTES', 'RELEVANT DETAILS (from Hubspot - from all clients list)']),
                    createdAt: createdAtDateString,
                    lastActivityAt: lastActivityDateString,
                    participants: Array.isArray(raw.PARTICIPANTS) ? raw.PARTICIPANTS : [],
                    linkedFlowIds: Array.isArray(raw.LINKED_FLOW_IDS) ? raw.LINKED_FLOW_IDS : [],
                };
                // console.log("Mapped contact item:", mappedContact); // Uncomment for debugging if needed
                return mappedContact;
            });
    
            // --- DEDUPLICATION LOGIC ADDED HERE ---
            setContacts((prev) => {
              const existingIds = new Set(prev.map(c => c.contactId));
              const newUniqueContacts = pageOfContacts.filter(c => {
                if (existingIds.has(c.contactId)) {
                  console.warn(`Duplicate contactId found and skipped: ${c.contactId}`);
                  return false; // Skip this contact as it's already in state
                }
                return true; // Keep this unique contact
              });
    
              const combined = [...prev, ...newUniqueContacts];
              console.log('>>> Fetched page, unique contacts added:', newUniqueContacts.length);
              console.log('>>> Total contacts now (after deduplication):', combined.length);
              return combined;
            });
            // --- END DEDUPLICATION LOGIC ---
    
            setLastKey(data.lastKey);
            if (!data.lastKey) {
              setHasMore(false);
            }
          } catch (err: any) {
            console.error('Failed to fetch contacts:', err);
            setFetchError(err.message || 'Unknown error');
          } finally {
            setLoadingPages(false);
          }
        },
        [loadingPages, user.userId]
      );
  
    // ─────────── 2) On mount, load page #1 ───────────
    useEffect(() => {
      fetchContactsPage();
    }, [fetchContactsPage]);
  
    // ─────────── 3) Derived Data: Filtering + Sorting ───────────
    const filteredAndSorted = useMemo(() => {
      let arr = [...contacts];
  
      // console.log("Before filters, contacts count:", arr.length);
  
      // 3a) “View” filter
      switch (viewFilter) {
        case 'my':
          // Filter out contacts that don't have a valid ownerId or don't match current user
          arr = arr.filter((c) => c.ownerId === user.userId);
          break;
        case 'sharedWithMe':
          arr = arr.filter((c) => {
            const participants = c.participants || [];
            return participants.includes(user.userId) && c.ownerId !== user.userId;
          });
          break;
        case 'sharedByMe':
          arr = arr.filter((c) => {
            const participants = c.participants || [];
            return c.ownerId === user.userId && participants.length > 0;
          });
          break;
        case 'all':
        default:
          // By default, show contacts owned by the user or shared with the user
          arr = arr.filter((c) => {
              const participants = c.participants || [];
              return c.ownerId === user.userId || participants.includes(user.userId);
          });
          break;
      }
      // console.log("After view filter, contacts count:", arr.length);
  
      // 3b) Search‐term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        arr = arr.filter((c) => {
          const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
          const e = (c.email || '').toLowerCase();
          const company = (c.company || '').toLowerCase();
          return fullName.includes(term) || e.includes(term) || company.includes(term);
        });
      }
      // console.log("After search term filter, contacts count:", arr.length);
  
  
      // 3c) Category filter
      if (categoryFilter !== 'all') {
        arr = arr.filter((c) => c.category === categoryFilter);
      }
      // console.log("After category filter, contacts count:", arr.length);
  
      // 3d) Status filter
      if (statusFilter !== 'all') {
        arr = arr.filter((c) => c.status === statusFilter);
      }
      // console.log("After status filter, contacts count:", arr.length);
  
      // 3e) Sorting
      arr.sort((a, b) => {
        let aVal: any = a[sortField as keyof Contact];
        let bVal: any = b[sortField as keyof Contact];
  
        if (sortField === 'firstName') {
          aVal = `${a.firstName || ''} ${a.lastName || ''}`;
          bVal = `${b.firstName || ''} ${b.lastName || ''}`;
        }
  
        // Handle undefined/null values for sorting
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';
  
  
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        } else if (typeof aVal === 'number') {
          // No change needed for numbers
        } else {
          // Fallback for other types or if still undefined/null
          aVal = String(aVal);
          bVal = String(bVal);
        }
  
  
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  
      // console.log("Final filtered and sorted contacts count:", arr.length);
      return arr;
    }, [
      contacts,
      viewFilter,
      searchTerm,
      categoryFilter,
      statusFilter,
      sortField,
      sortDirection,
      user.userId,
    ]);
  
    // ─────────── 4) “Displayed for the Current Page” ───────────
    const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE) || 1;
    const displayedContacts = useMemo(() => {
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const sliced = filteredAndSorted.slice(startIndex, startIndex + PAGE_SIZE);
      // console.log("Contacts displayed on current page:", sliced.length);
      return sliced;
    }, [filteredAndSorted, currentPage]);
  
    // If the data shrinks below the current page, clamp it:
    useEffect(() => {
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }, [totalPages, currentPage]);
  
    // ─────────── 5) Handlers ───────────
    const handleSort = (
      field: keyof Omit<
        Contact,
        | 'participants'
        | 'linkedFlowIds'
        | 'address'
        | 'notes'
        | 'ownerId'
        | 'contactId'
      >
    ) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field as any);
        setSortDirection('asc');
      }
    };
  
    const handleSelectAll = () => {
      if (selectedContactIds.size === filteredAndSorted.length) {
        setSelectedContactIds(new Set());
      } else {
        setSelectedContactIds(new Set(filteredAndSorted.map((c) => c.contactId)));
      }
    };
    const handleSelectContact = (contactId: string) => {
      const newSet = new Set(selectedContactIds);
      if (newSet.has(contactId)) newSet.delete(contactId);
      else newSet.add(contactId);
      setSelectedContactIds(newSet);
    };
  
    const handleInlineEdit = (contactId: string, field: keyof Contact, value: string) => {
      setContacts((prev) =>
        prev.map((c) =>
          c.contactId === contactId
            ? { ...c, [field]: value, lastActivityAt: new Date().toISOString() }
            : c
        )
      );
      setEditingContactId(null);
      setEditingField(null);
    };
  
    const handleCreateContact = () => {
      const newContact: Contact = {
        contactId: `contact_${Date.now()}`,
        ownerId: user.userId,
        firstName: formData.firstName || 'New',
        lastName: formData.lastName || 'Contact',
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        category: formData.category || 'lead',
        status: formData.status,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        participants: [],
        linkedFlowIds: [],
      };
      setContacts((prev) => [newContact, ...prev]);
      setShowCreateModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        status: 'active',
        notes: '',
      });
    };
  
    const handleDeleteSelected = () => {
      if (selectedContactIds.size === 0) return;
      if (window.confirm(`Delete ${selectedContactIds.size} contact(s)?`)) {
        setContacts((prev) => prev.filter((c) => !selectedContactIds.has(c.contactId)));
        setSelectedContactIds(new Set());
      }
    };
  
    // ─────────── 6) Page Navigation Handlers ───────────
    const goPrevPage = () => {
      if (currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    };
  
    const goNextPage = async () => {
      const nextPageIndex = currentPage + 1;
      const startIndex = (nextPageIndex - 1) * PAGE_SIZE;
  
      // Check if we already have enough contacts loaded for the next page
      if (startIndex < filteredAndSorted.length) {
        setCurrentPage(nextPageIndex);
      } else {
        // Need to fetch more from Lambda
        if (hasMore && !loadingPages && lastKey) { // Ensure lastKey exists for next fetch
          await fetchContactsPage(lastKey);
          // Only advance page if fetch was successful and brought new data,
          // or if it was the last page and we hit the end.
          // This logic can be tricky with pagination and filtering combined.
          // For simplicity, we'll assume fetchContactsPage updates `contacts`
          // and then `filteredAndSorted` and `displayedContacts` will react.
          // It's often simpler to just show "Load More" and *not* auto-advance page
          // if displaying *all* loaded items (not just one page)
          // or re-calculate totalPages/displayedContacts after fetch.
          // For current logic, we'll just advance page after fetch.
          setCurrentPage(nextPageIndex);
        } else if (hasMore && !loadingPages && !lastKey) {
          // This case indicates a potential problem if hasMore is true but lastKey is null
          // which implies no more pages are available from the API even if data exists.
          // You might want to log this scenario.
          console.warn("hasMore is true but lastKey is null, no more data to fetch.");
        }
      }
    };
  
    // ─────────── 7) Helper Colors ───────────
    const getStatusColor = (status: Contact['status']) => {
      switch (status) {
        case 'active':
          return '#10B981';
        case 'inactive':
          return '#F59E0B';
        case 'on hold':
          return '#DE1785';
        case 'archived':
          return '#6B7280';
        default:
          return '#6B7280'; // Default for unhandled status
      }
    };
    const getCategoryColor = (category?: string) => {
      switch (category) {
        case 'customer':
          return '#8B5CF6';
        case 'lead':
          return '#DE1785';
        case 'partner':
          return '#10B981';
        default:
          return '#6B7280'; // Default for unhandled category
      }
    };
  
    const categoryOptions = useMemo(() => {
      const s = new Set<string>();
      contacts.forEach((c) => {
        if (c.category) s.add(c.category);
      });
      // Add "uncategorized" if it's a common default
      if (s.has('uncategorized')) return Array.from(s).sort();
      return Array.from(s).sort();
    }, [contacts]);
  
    const statusOptions: Contact['status'][] = ['active', 'inactive', 'on hold', 'archived'];
  
    // ─────────── 8) Render ───────────
    return (
      <div
        style={{
          height: '96vh',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          flexDirection: 'column',
          marginTop: '4vh',
        }}
      >
        {/* ───── Header ───── */}
        <div
          style={{
            backgroundColor: '#FFFBFA',
            borderBottom: '1px solid #FFFBFA',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>
            Contacts
          </h1>
  
          {/* Search + AddButton */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts..."
              style={{
                padding: '8px 16px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                width: '300px',
                fontSize: '14px',
              }}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: '#DE1785',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Add Contact
            </button>
          </div>
        </div>
  
        {/* ───── Toolbar ───── */}
        <div
          style={{
            backgroundColor: '#FFFBFA',
            borderBottom: '1px solid #E5E7EB',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* View filters */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'my', 'sharedWithMe', 'sharedByMe'] as ViewFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setViewFilter(filter)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  background: viewFilter === filter ? '#DE1785' : '#fff',
                  color: viewFilter === filter ? '#fff' : '#374151',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {filter === 'all'
                  ? 'All'
                  : filter === 'my'
                  ? 'My Contacts'
                  : filter === 'sharedWithMe'
                  ? 'Shared with me'
                  : 'Shared by me'}
              </button>
            ))}
          </div>
  
          <div style={{ borderLeft: '1px solid #E5E7EB', height: '24px' }} />
  
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
  
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '6px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
  
          {/* Delete Selected */}
          {selectedContactIds.size > 0 && (
            <>
              <div style={{ borderLeft: '1px solid #E5E7EB', height: '24px' }} />
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                {selectedContactIds.size} selected
              </span>
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #DC2626',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
  
        {/* ───── Table & Pagination Controls ───── */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#FFFBFA',
            paddingRight: 10,
            paddingLeft: 10,
          }}
        >
          <table style={{ width: '100%', backgroundColor: '#fff', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F3F4F6', zIndex: 10 }}>
              <tr>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    borderBottom: '1px solid #E5E7EB',
                    width: '40px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedContactIds.size === filteredAndSorted.length && filteredAndSorted.length > 0
                    }
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
  
                {/* “Name” column */}
                <th
                  onClick={() => handleSort('firstName')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    borderBottom: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Name
                    {sortField === 'firstName' && (
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                        <path
                          d={
                            sortDirection === 'asc'
                              ? 'M10 3l-7 7h14l-7-7z'
                              : 'M10 17l7-7H3l7 7z'
                          }
                        />
                      </svg>
                    )}
                  </div>
                </th>
  
                {/* Company */}
                {visibleColumns.company && (
                  <th
                    onClick={() => handleSort('company')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Company
                      {sortField === 'company' && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                          <path
                            d={
                              sortDirection === 'asc'
                                ? 'M10 3l-7 7h14l-7-7z'
                                : 'M10 17l7-7H3l7 7z'
                            }
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                )}
  
                {/* Email */}
                {visibleColumns.email && (
                  <th
                    onClick={() => handleSort('email')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Email
                      {sortField === 'email' && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                          <path
                            d={
                              sortDirection === 'asc'
                                ? 'M10 3l-7 7h14l-7-7z'
                                : 'M10 17l7-7H3l7 7z'
                            }
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                )}
  
                {/* Phone */}
                {visibleColumns.phone && (
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Phone
                  </th>
                )}
  
                {/* Category */}
                {visibleColumns.category && (
                  <th
                    onClick={() => handleSort('category')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Category
                      {sortField === 'category' && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                          <path
                            d={
                              sortDirection === 'asc'
                                ? 'M10 3l-7 7h14l-7-7z'
                                : 'M10 17l7-7H3l7 7z'
                            }
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                )}
  
                {/* Status */}
                {visibleColumns.status && (
                  <th
                    onClick={() => handleSort('status')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Status
                      {sortField === 'status' && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                          <path
                            d={
                              sortDirection === 'asc'
                                ? 'M10 3l-7 7h14l-7-7z'
                                : 'M10 17l7-7H3l7 7z'
                            }
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                )}
  
                {/* Last Activity */}
                {visibleColumns.lastActivity && (
                  <th
                    onClick={() => handleSort('lastActivityAt')}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Last Activity
                      {sortField === 'lastActivityAt' && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                          <path
                            d={
                              sortDirection === 'asc'
                                ? 'M10 3l-7 7h14l-7-7z'
                                : 'M10 17l7-7H3l7 7z'
                            }
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                )}
  
                {/* Notes */}
                {visibleColumns.notes && (
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      borderBottom: '1px solid #E5E7EB',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    Notes
                  </th>
                )}
  
                {/* Actions */}
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: '1px solid #E5E7EB',
                    width: '80px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedContacts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#6B7280' }}>
                    {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'No contacts found matching criteria'
                      : loadingPages
                      ? 'Loading…'
                      : 'No contacts created yet'}
                  </td>
                </tr>
              ) : (
                displayedContacts.map((contact) => (
                  <React.Fragment key={contact.contactId}>
                    <tr
                      style={{
                        backgroundColor: selectedContactIds.has(contact.contactId) ? '#EFF6FF' : '#fff',
                        borderBottom: '1px solid #E5E7EB',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedContactIds.has(contact.contactId)) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedContactIds.has(contact.contactId)) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(contact.contactId)}
                          onChange={() => handleSelectContact(contact.contactId)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
  
                      {/* Name column (inline‐edit example) */}
                      <td style={{ padding: '16px' }}>
                        {editingContactId === contact.contactId && editingField === 'name' ? (
                          <input
                            type="text"
                            defaultValue={`${contact.firstName || ''} ${contact.lastName || ''}`}
                            onBlur={(e) => {
                              const [firstName, ...lastParts] = e.target.value.split(' ');
                              handleInlineEdit(contact.contactId, 'firstName', firstName);
                              handleInlineEdit(contact.contactId, 'lastName', lastParts.join(' '));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '2px solid #DE1785',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => {
                              setEditingContactId(contact.contactId);
                              setEditingField('name');
                            }}
                            style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}
                          >
                            {contact.firstName || '-'} {contact.lastName || '-'}
                          </div>
                        )}
                      </td>
  
                      {/* Company */}
                      {visibleColumns.company && (
                        <td style={{ padding: '16px' }}>
                          {editingContactId === contact.contactId && editingField === 'company' ? (
                            <input
                              type="text"
                              defaultValue={contact.company || ''}
                              onBlur={(e) => handleInlineEdit(contact.contactId, 'company', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '2px solid #DE1785',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingContactId(contact.contactId);
                                setEditingField('company');
                              }}
                              style={{ fontSize: '14px', color: '#374151' }}
                            >
                              {contact.company || '-'}
                            </div>
                          )}
                        </td>
                      )}
  
                      {/* Email */}
                      {visibleColumns.email && (
                        <td style={{ padding: '16px' }}>
                          {editingContactId === contact.contactId && editingField === 'email' ? (
                            <input
                              type="email"
                              defaultValue={contact.email || ''}
                              onBlur={(e) => handleInlineEdit(contact.contactId, 'email', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '2px solid #DE1785',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingContactId(contact.contactId);
                                setEditingField('email');
                              }}
                              style={{ fontSize: '14px', color: '#374151' }}
                            >
                              {contact.email || '-'}
                            </div>
                          )}
                        </td>
                      )}
  
                      {/* Phone */}
                      {visibleColumns.phone && (
                        <td style={{ padding: '16px' }}>
                          {editingContactId === contact.contactId && editingField === 'phone' ? (
                            <input
                              type="tel"
                              defaultValue={contact.phone || ''}
                              onBlur={(e) => handleInlineEdit(contact.contactId, 'phone', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '2px solid #DE1785',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingContactId(contact.contactId);
                                setEditingField('phone');
                              }}
                              style={{ fontSize: '14px', color: '#374151' }}
                            >
                              {contact.phone || '-'}
                            </div>
                          )}
                        </td>
                      )}
  
                      {/* Category */}
                      {visibleColumns.category && (
                        <td style={{ padding: '16px' }}>
                          {editingContactId === contact.contactId && editingField === 'category' ? (
                            <select
                              defaultValue={contact.category || ''}
                              onBlur={(e) => handleInlineEdit(contact.contactId, 'category', e.target.value)}
                              onChange={(e) => {
                                handleInlineEdit(contact.contactId, 'category', e.target.value);
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '2px solid #DE1785',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            >
                              <option value="">None</option>
                              {categoryOptions.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingContactId(contact.contactId);
                                setEditingField('category');
                              }}
                            >
                              {contact.category ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: getCategoryColor(contact.category) + '20',
                                    color: getCategoryColor(contact.category),
                                  }}
                                >
                                  {contact.category}
                                </span>
                              ) : (
                                '-'
                              )}
                            </div>
                          )}
                        </td>
                      )}
  
                      {/* Status */}
                      {visibleColumns.status && (
                        <td style={{ padding: '16px' }}>
                          {editingContactId === contact.contactId && editingField === 'status' ? (
                            <select
                              defaultValue={contact.status}
                              onChange={(e) => handleInlineEdit(contact.contactId, 'status', e.target.value)}
                              onBlur={() => {
                                setEditingContactId(null);
                                setEditingField(null);
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '2px solid #DE1785',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            >
                              {statusOptions.map((st) => (
                                <option key={st} value={st}>
                                  {st.charAt(0).toUpperCase() + st.slice(1)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingContactId(contact.contactId);
                                setEditingField('status');
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  backgroundColor: getStatusColor(contact.status) + '20',
                                  color: getStatusColor(contact.status),
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: getStatusColor(contact.status),
                                  }}
                                />
                                {contact.status}
                              </span>
                            </div>
                          )}
                        </td>
                      )}
  
                      {/* Last Activity */}
                      {visibleColumns.lastActivity && (
                        <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                          {/* Safely format date, handle potential errors if date is invalid */}
                          {contact.lastActivityAt && !isNaN(new Date(contact.lastActivityAt).getTime())
                              ? new Date(contact.lastActivityAt).toLocaleDateString()
                              : '-'}
                        </td>
                      )}
  
                      {/* Notes */}
                      {visibleColumns.notes && (
                        <td style={{ padding: '16px' }}>
                          {editingContactId === contact.contactId && editingField === 'notes' ? (
                            <textarea
                              defaultValue={contact.notes || ''}
                              onBlur={(e) => handleInlineEdit(contact.contactId, 'notes', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                border: '2px solid #DE1785',
                                borderRadius: '4px',
                                fontSize: '14px',
                                resize: 'vertical',
                                minHeight: '40px',
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => {
                                setEditingContactId(contact.contactId);
                                setEditingField('notes');
                              }}
                              style={{
                                fontSize: '14px',
                                color: '#6B7280',
                                maxWidth: '300px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={contact.notes}
                            >
                              {contact.notes || '-'}
                            </div>
                          )}
                        </td>
                      )}
  
                      {/* Actions (expand / delete) */}
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowId((prev) =>
                              prev === contact.contactId ? null : contact.contactId
                            );
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="#6B7280">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
  
                    {expandedRowId === contact.contactId && (
                      <tr>
                        <td
                          colSpan={10}
                          style={{
                            padding: '0',
                            backgroundColor: '#F9FAFB',
                            borderBottom: '1px solid #E5E7EB',
                          }}
                        >
                          <div
                            style={{
                              padding: '24px',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '24px',
                            }}
                          >
                            <div>
                              <h3
                                style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  marginBottom: '12px',
                                  color: '#111827',
                                }}
                              >
                                Contact Details
                              </h3>
                              <div>
                                {contact.address && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#6B7280',
                                        marginRight: '8px',
                                      }}
                                    >
                                      Address:
                                    </span>
                                    <span
                                      style={{ fontSize: '14px', color: '#374151' }}
                                    >
                                      {contact.address}
                                    </span>
                                  </div>
                                )}
                                <div style={{ marginBottom: '8px' }}>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      color: '#6B7280',
                                      marginRight: '8px',
                                    }}
                                  >
                                    Created:
                                  </span>
                                  <span
                                    style={{ fontSize: '14px', color: '#374151' }}
                                  >
                                    {/* Safely format date */}
                                    {contact.createdAt && !isNaN(new Date(contact.createdAt).getTime())
                                        ? new Date(contact.createdAt).toLocaleString()
                                        : '-'}
                                  </span>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      color: '#6B7280',
                                      marginRight: '8px',
                                    }}
                                  >
                                    Owner:
                                  </span>
                                  <span style={{ fontSize: '14px', color: '#374151' }}>
                                    {contact.ownerId === user.userId
                                      ? 'You'
                                      : contact.ownerId}
                                  </span>
                                </div>
                                {contact.participants.length > 0 && (
                                  <div>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#6B7280',
                                        marginRight: '8px',
                                      }}
                                    >
                                      Shared with:
                                    </span>
                                    <span
                                      style={{ fontSize: '14px', color: '#374151' }}
                                    >
                                      {contact.participants.length} user(s)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h3
                                style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  marginBottom: '12px',
                                  color: '#111827',
                                }}
                              >
                                Quick Actions
                              </h3>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => {
                                    if (contact.email) {
                                      window.location.href = `mailto:${contact.email}`;
                                    }
                                  }}
                                  disabled={!contact.email}
                                  style={{
                                    padding: '6px 12px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    background: '#fff',
                                    fontSize: '13px',
                                    cursor: contact.email ? 'pointer' : 'not-allowed',
                                    opacity: contact.email ? 1 : 0.5,
                                  }}
                                >
                                  Send Email
                                </button>
                                <button
                                  onClick={() => {
                                    if (contact.phone) {
                                      window.location.href = `tel:${contact.phone}`;
                                    }
                                  }}
                                  disabled={!contact.phone}
                                  style={{
                                    padding: '6px 12px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    background: '#fff',
                                    fontSize: '13px',
                                    cursor: contact.phone ? 'pointer' : 'not-allowed',
                                    opacity: contact.phone ? 1 : 0.5,
                                  }}
                                >
                                  Call
                                </button>
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Delete ${contact.firstName} ${contact.lastName}?`
                                      )
                                    ) {
                                      setContacts((prev) =>
                                        prev.filter((c) => c.contactId !== contact.contactId)
                                      );
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    border: '1px solid #DC2626',
                                    borderRadius: '4px',
                                    background: '#fff',
                                    color: '#DC2626',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
  
          {/* ─────────── “Load More” / Page Buttons ─────────── */}
          <div style={{ textAlign: 'center', padding: '16px' }}>
            {fetchError && (
              <div style={{ color: 'red', marginBottom: '8px' }}>
                Error loading contacts: {fetchError}
              </div>
            )}
  
            {displayedContacts.length === 0 && loadingPages && (
              <div style={{ color: '#6B7280' }}>Loading first page…</div>
            )}
  
            {filteredAndSorted.length > 0 && (
              <div style={{ display: 'inline-flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={goPrevPage}
                  disabled={currentPage === 1 || loadingPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    background: currentPage === 1 ? '#F3F4F6' : '#fff',
                    color: '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ‹ Prev
                </button>
  
                <span style={{ fontSize: '14px', color: '#374151' }}>
                  Page {currentPage} of {totalPages}
                </span>
  
                <button
                  onClick={goNextPage}
                  disabled={(!hasMore && currentPage === totalPages) || loadingPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    background:
                      !hasMore && currentPage === totalPages ? '#F3F4F6' : '#fff',
                    color: '#374151',
                    cursor:
                      (!hasMore && currentPage === totalPages) || loadingPages
                        ? 'not-allowed'
                        : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Next ›
                </button>
              </div>
            )}
  
            {!hasMore && filteredAndSorted.length > 0 && currentPage === totalPages && (
              <div style={{ marginTop: 8, color: '#6B7280' }}>All contacts loaded.</div>
            )}
          </div>
  
          {/* ─────────── “Create Contact” Modal (unchanged) ─────────── */}
          {showCreateModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  width: '500px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
              >
                <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
                  Create New Contact
                </h2>
                {/* … (Form fields remain unchanged) … */}
  
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '24px',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        firstName: '',
                        lastName: '',
                        company: '',
                        email: '',
                        phone: '',
                        address: '',
                        category: '',
                        status: 'active',
                        notes: '',
                      });
                    }}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      background: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateContact}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      background: '#DE1785',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Create Contact
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      );
  };
  
  export default ContactsCRM;