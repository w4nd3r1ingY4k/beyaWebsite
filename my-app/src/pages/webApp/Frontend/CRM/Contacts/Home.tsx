import React, { useState, useEffect, useMemo, useRef } from 'react'

// ─────────── Constants ───────────
const API_BASE = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod'

// ─────────── Types and Interfaces ───────────
interface Contact {
    contactId: string
    ownerId: string
    firstName: string
    lastName: string
    company?: string
    email?: string
    phone?: string
    address?: string
    category?: string
    status: 'active' | 'inactive' | 'on hold' | 'archived'
    notes?: string
    createdAt: string
    lastActivityAt: string
    participants: string[]
    linkedFlowIds: string[]
}

interface ContactNote {
    noteId: string
    contactId: string
    authorId: string
    authorName: string
    text: string
    createdAt: string
}

interface LinkedMessage {
    messageId: string
    flowId: string
    type: 'email' | 'whatsapp' | 'note'
    content: string
    timestamp: string
    author: string
}

type ViewFilter = 'all' | 'my' | 'sharedWithMe' | 'sharedByMe'
type SortField = 'firstName' | 'lastActivityAt' | 'createdAt' | 'company' | 'email' | 'status' | 'category'
type SortDirection = 'asc' | 'desc'

const ContactsCRM: React.FC = () => {
    // ─────────── Mock Auth Context ───────────
    const user = {
        userId: 'user123',
        displayName: 'John Doe',
        email: 'john@example.com'
    }

    // ─────────── Component State ───────────
    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
    const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortField, setSortField] = useState<SortField>('lastActivityAt')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingContactId, setEditingContactId] = useState<string | null>(null)
    const [editingField, setEditingField] = useState<string | null>(null)

    // Contact form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        status: 'active' as Contact['status'],
        notes: ''
    })

    // Notes and interactions
    const [contactNotes, setContactNotes] = useState<ContactNote[]>([])
    const [newNote, setNewNote] = useState('')

    // Column visibility
    const [visibleColumns, setVisibleColumns] = useState({
        firstName: true,
        company: true,
        email: true,
        phone: true,
        category: true,
        status: true,
        lastActivity: true,
        notes: true
    })

    // ─────────── Mock Data ───────────
    const mockContacts: Contact[] = [
        {
            contactId: '1',
            ownerId: 'user123',
            firstName: 'Alice',
            lastName: 'Johnson',
            company: 'Tech Corp',
            email: 'alice@techcorp.com',
            phone: '+1234567890',
            address: '123 Tech Street, San Francisco, CA',
            category: 'customer',
            status: 'active',
            notes: 'Important client for Q4 project',
            createdAt: '2023-10-01T10:00:00Z',
            lastActivityAt: '2023-10-25T15:30:00Z',
            participants: ['user456'],
            linkedFlowIds: ['flow1', 'flow2']
        },
        {
            contactId: '2',
            ownerId: 'user456',
            firstName: 'Bob',
            lastName: 'Smith',
            company: 'StartupXYZ',
            email: 'bob@startupxyz.com',
            phone: '+1987654321',
            category: 'lead',
            status: 'active',
            notes: 'Potential partnership opportunity',
            createdAt: '2023-10-15T14:20:00Z',
            lastActivityAt: '2023-10-24T09:15:00Z',
            participants: ['user123'],
            linkedFlowIds: ['flow3']
        },
        {
            contactId: '3',
            ownerId: 'user123',
            firstName: 'Carol',
            lastName: 'Davis',
            company: 'Enterprise Solutions',
            email: 'carol@enterprise.com',
            phone: '+1555666777',
            category: 'partner',
            status: 'inactive',
            notes: 'Former partner, maintain relationship',
            createdAt: '2023-09-20T11:45:00Z',
            lastActivityAt: '2023-10-20T16:00:00Z',
            participants: [],
            linkedFlowIds: []
        },
        {
            contactId: '4',
            ownerId: 'user123',
            firstName: 'David',
            lastName: 'Wilson',
            company: 'Global Industries',
            email: 'david@global.com',
            phone: '+1444555666',
            category: 'customer',
            status: 'on hold',
            notes: 'Waiting for budget approval',
            createdAt: '2023-09-15T09:30:00Z',
            lastActivityAt: '2023-10-22T14:20:00Z',
            participants: [],
            linkedFlowIds: ['flow4']
        },
        {
            contactId: '5',
            ownerId: 'user123',
            firstName: 'Emma',
            lastName: 'Thompson',
            company: 'Digital Dynamics',
            email: 'emma@digitaldynamics.com',
            phone: '+1333444555',
            category: 'lead',
            status: 'active',
            notes: 'Interested in our enterprise solution',
            createdAt: '2023-10-18T11:00:00Z',
            lastActivityAt: '2023-10-26T16:45:00Z',
            participants: ['user456'],
            linkedFlowIds: []
        }
    ]

    // ─────────── Effects ───────────
    useEffect(() => {
        setContacts(mockContacts)
    }, [])

    // ─────────── Derived Data ───────────
    const filteredContacts = useMemo(() => {
        let filtered = contacts

        // Filter by view
        switch (viewFilter) {
            case 'my':
                filtered = filtered.filter(c => c.ownerId === user.userId)
                break
            case 'sharedWithMe':
                filtered = filtered.filter(c => c.participants.includes(user.userId) && c.ownerId !== user.userId)
                break
            case 'sharedByMe':
                filtered = filtered.filter(c => c.ownerId === user.userId && c.participants.length > 0)
                break
            case 'all':
            default:
                filtered = filtered.filter(c => c.ownerId === user.userId || c.participants.includes(user.userId))
                break
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(c =>
                c.firstName.toLowerCase().includes(term) ||
                c.lastName.toLowerCase().includes(term) ||
                c.company?.toLowerCase().includes(term) ||
                c.email?.toLowerCase().includes(term) ||
                c.phone?.includes(term)
            )
        }

        // Filter by category
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(c => c.category === categoryFilter)
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.status === statusFilter)
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal: any = a[sortField as keyof Contact]
            let bVal: any = b[sortField as keyof Contact]

            if (sortField === 'firstName') {
                aVal = `${a.firstName} ${a.lastName}`
                bVal = `${b.firstName} ${b.lastName}`
            }

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase()
                bVal = bVal.toLowerCase()
            }

            if (sortDirection === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
            }
        })

        return filtered
    }, [contacts, viewFilter, searchTerm, categoryFilter, statusFilter, sortField, sortDirection, user.userId])

    const categoryOptions = useMemo(() => {
        const categories = new Set<string>()
        contacts.forEach(c => {
            if (c.category) categories.add(c.category)
        })
        return Array.from(categories)
    }, [contacts])

    const statusOptions: Contact['status'][] = ['active', 'inactive', 'on hold', 'archived']

    // ─────────── Event Handlers ───────────
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const handleSelectAll = () => {
        if (selectedContactIds.size === filteredContacts.length) {
            setSelectedContactIds(new Set())
        } else {
            setSelectedContactIds(new Set(filteredContacts.map(c => c.contactId)))
        }
    }

    const handleSelectContact = (contactId: string) => {
        const newSelected = new Set(selectedContactIds)
        if (newSelected.has(contactId)) {
            newSelected.delete(contactId)
        } else {
            newSelected.add(contactId)
        }
        setSelectedContactIds(newSelected)
    }

    const handleInlineEdit = (contactId: string, field: keyof Contact, value: string) => {
        setContacts(prev => prev.map(c => 
            c.contactId === contactId 
                ? { ...c, [field]: value, lastActivityAt: new Date().toISOString() }
                : c
        ))
        setEditingContactId(null)
        setEditingField(null)
    }

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
            linkedFlowIds: []
        }

        setContacts(prev => [newContact, ...prev])
        setShowCreateModal(false)
        setFormData({
            firstName: '',
            lastName: '',
            company: '',
            email: '',
            phone: '',
            address: '',
            category: '',
            status: 'active',
            notes: ''
        })
    }

    const handleDeleteSelected = () => {
        if (selectedContactIds.size === 0) return
        
        if (window.confirm(`Delete ${selectedContactIds.size} contact(s)?`)) {
            setContacts(prev => prev.filter(c => !selectedContactIds.has(c.contactId)))
            setSelectedContactIds(new Set())
        }
    }

    const getStatusColor = (status: Contact['status']) => {
        switch (status) {
            case 'active': return '#10B981'
            case 'inactive': return '#F59E0B'
            case 'on hold': return '#DE1785'
            case 'archived': return '#6B7280'
            default: return '#6B7280'
        }
    }

    const getCategoryColor = (category?: string) => {
        switch (category) {
            case 'customer': return '#8B5CF6'
            case 'lead': return '#DE1785'
            case 'partner': return '#10B981'
            default: return '#6B7280'
        }
    }

    // ─────────── Render ───────────
    return (
        <div style={{ height: '96vh', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', marginTop: '4vh' }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#FFFBFA',
                borderBottom: '1px solid #FFFBFA',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>
                    Contacts
                </h1>
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
                            fontSize: '14px'
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
                            gap: '6px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                        </svg>
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div style={{
                backgroundColor: '#FFFBFA',
                borderBottom: '1px solid #E5E7EB',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                {/* View filters */}
                <div style={{ display: 'flex', gap: '8px'}}>
                    {(['all', 'my', 'sharedWithMe', 'sharedByMe'] as ViewFilter[]).map(filter => (
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
                                fontWeight: '500'
                            }}
                        >
                            {filter === 'all' ? 'All' :
                             filter === 'my' ? 'My Contacts' :
                             filter === 'sharedWithMe' ? 'Shared with me' :
                             'Shared by me'}
                        </button>
                    ))}
                </div>

                <div style={{ borderLeft: '1px solid #E5E7EB', height: '24px' }} />

                {/* Filters */}
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Categories</option>
                    {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Status</option>
                    {statusOptions.map(status => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                    ))}
                </select>

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
                                fontWeight: '500'
                            }}
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#FFFBFA', paddingRight: 10, paddingLeft: 10 }}>
                <table style={{ width: '100%', backgroundColor: '#fff', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F3F4F6', zIndex: 10 }}>
                        <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #E5E7EB', width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0}
                                    onChange={handleSelectAll}
                                    style={{ cursor: 'pointer' }}
                                />
                            </th>
                            <th 
                                onClick={() => handleSort('firstName')}
                                style={{ 
                                    padding: '12px 16px', 
                                    textAlign: 'left', 
                                    borderBottom: '1px solid #E5E7EB',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Name
                                    {sortField === 'firstName' && (
                                        <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                                            <path d={sortDirection === 'asc' ? 'M10 3l-7 7h14l-7-7z' : 'M10 17l7-7H3l7 7z'} />
                                        </svg>
                                    )}
                                </div>
                            </th>
                            {visibleColumns.company && (
                                <th 
                                    onClick={() => handleSort('company')}
                                    style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left', 
                                        borderBottom: '1px solid #E5E7EB',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Company
                                        {sortField === 'company' && (
                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                                                <path d={sortDirection === 'asc' ? 'M10 3l-7 7h14l-7-7z' : 'M10 17l7-7H3l7 7z'} />
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.email && (
                                <th 
                                    onClick={() => handleSort('email')}
                                    style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left', 
                                        borderBottom: '1px solid #E5E7EB',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Email
                                        {sortField === 'email' && (
                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                                                <path d={sortDirection === 'asc' ? 'M10 3l-7 7h14l-7-7z' : 'M10 17l7-7H3l7 7z'} />
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.phone && (
                                <th style={{ 
                                    padding: '12px 16px', 
                                    textAlign: 'left', 
                                    borderBottom: '1px solid #E5E7EB',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Phone
                                </th>
                            )}
                            {visibleColumns.category && (
                                <th 
                                    onClick={() => handleSort('category')}
                                    style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left', 
                                        borderBottom: '1px solid #E5E7EB',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Category
                                        {sortField === 'category' && (
                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                                                <path d={sortDirection === 'asc' ? 'M10 3l-7 7h14l-7-7z' : 'M10 17l7-7H3l7 7z'} />
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.status && (
                                <th 
                                    onClick={() => handleSort('status')}
                                    style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left', 
                                        borderBottom: '1px solid #E5E7EB',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Status
                                        {sortField === 'status' && (
                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                                                <path d={sortDirection === 'asc' ? 'M10 3l-7 7h14l-7-7z' : 'M10 17l7-7H3l7 7z'} />
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.lastActivity && (
                                <th 
                                    onClick={() => handleSort('lastActivityAt')}
                                    style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left', 
                                        borderBottom: '1px solid #E5E7EB',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Last Activity
                                        {sortField === 'lastActivityAt' && (
                                            <svg width="12" height="12" viewBox="0 0 20 20" fill="#6B7280">
                                                <path d={sortDirection === 'asc' ? 'M10 3l-7 7h14l-7-7z' : 'M10 17l7-7H3l7 7z'} />
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            )}
                            {visibleColumns.notes && (
                                <th style={{ 
                                    padding: '12px 16px', 
                                    textAlign: 'left', 
                                    borderBottom: '1px solid #E5E7EB',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#374151'
                                }}>
                                    Notes
                                </th>
                            )}
                            <th style={{ 
                                padding: '12px 16px', 
                                textAlign: 'center', 
                                borderBottom: '1px solid #E5E7EB',
                                width: '80px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContacts.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#6B7280' }}>
                                    {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' 
                                        ? 'No contacts found matching criteria' 
                                        : 'No contacts created yet'}
                                </td>
                            </tr>
                        ) : (
                            filteredContacts.map(contact => (
                                <React.Fragment key={contact.contactId}>
                                    <tr 
                                        style={{ 
                                            backgroundColor: selectedContactIds.has(contact.contactId) ? '#EFF6FF' : '#fff',
                                            borderBottom: '1px solid #E5E7EB',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={e => {
                                            if (!selectedContactIds.has(contact.contactId)) {
                                                e.currentTarget.style.backgroundColor = '#F9FAFB'
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!selectedContactIds.has(contact.contactId)) {
                                                e.currentTarget.style.backgroundColor = '#fff'
                                            }
                                        }}
                                    >
                                        <td style={{ padding: '16px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedContactIds.has(contact.contactId)}
                                                onChange={() => handleSelectContact(contact.contactId)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {editingContactId === contact.contactId && editingField === 'name' ? (
                                                <input
                                                    type="text"
                                                    defaultValue={`${contact.firstName} ${contact.lastName}`}
                                                    onBlur={(e) => {
                                                        const [firstName, ...lastNameParts] = e.target.value.split(' ')
                                                        handleInlineEdit(contact.contactId, 'firstName', firstName)
                                                        handleInlineEdit(contact.contactId, 'lastName', lastNameParts.join(' '))
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur()
                                                        }
                                                    }}
                                                    autoFocus
                                                    style={{
                                                        width: '100%',
                                                        padding: '4px 8px',
                                                        border: '2px solid #DE1785',
                                                        borderRadius: '4px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            ) : (
                                                <div 
                                                    onClick={() => {
                                                        setEditingContactId(contact.contactId)
                                                        setEditingField('name')
                                                    }}
                                                    style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}
                                                >
                                                    {contact.firstName} {contact.lastName}
                                                </div>
                                            )}
                                        </td>
                                        {visibleColumns.company && (
                                            <td style={{ padding: '16px' }}>
                                                {editingContactId === contact.contactId && editingField === 'company' ? (
                                                    <input
                                                        type="text"
                                                        defaultValue={contact.company || ''}
                                                        onBlur={(e) => handleInlineEdit(contact.contactId, 'company', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur()
                                                            }
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 8px',
                                                            border: '2px solid #DE1785',
                                                            borderRadius: '4px',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setEditingContactId(contact.contactId)
                                                            setEditingField('company')
                                                        }}
                                                        style={{ fontSize: '14px', color: '#374151' }}
                                                    >
                                                        {contact.company || '-'}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.email && (
                                            <td style={{ padding: '16px' }}>
                                                {editingContactId === contact.contactId && editingField === 'email' ? (
                                                    <input
                                                        type="email"
                                                        defaultValue={contact.email || ''}
                                                        onBlur={(e) => handleInlineEdit(contact.contactId, 'email', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur()
                                                            }
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 8px',
                                                            border: '2px solid #DE1785',
                                                            borderRadius: '4px',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setEditingContactId(contact.contactId)
                                                            setEditingField('email')
                                                        }}
                                                        style={{ fontSize: '14px', color: '#374151' }}
                                                    >
                                                        {contact.email || '-'}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.phone && (
                                            <td style={{ padding: '16px' }}>
                                                {editingContactId === contact.contactId && editingField === 'phone' ? (
                                                    <input
                                                        type="tel"
                                                        defaultValue={contact.phone || ''}
                                                        onBlur={(e) => handleInlineEdit(contact.contactId, 'phone', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur()
                                                            }
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 8px',
                                                            border: '2px solid #DE1785',
                                                            borderRadius: '4px',
                                                            fontSize: '14px'
                                                        }}
                                                    />
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setEditingContactId(contact.contactId)
                                                            setEditingField('phone')
                                                        }}
                                                        style={{ fontSize: '14px', color: '#374151' }}
                                                    >
                                                        {contact.phone || '-'}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.category && (
                                            <td style={{ padding: '16px' }}>
                                                {editingContactId === contact.contactId && editingField === 'category' ? (
                                                    <select
                                                        defaultValue={contact.category || ''}
                                                        onBlur={(e) => handleInlineEdit(contact.contactId, 'category', e.target.value)}
                                                        onChange={(e) => {
                                                            handleInlineEdit(contact.contactId, 'category', e.target.value)
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 8px',
                                                            border: '2px solid #DE1785',
                                                            borderRadius: '4px',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        <option value="">None</option>
                                                        {categoryOptions.map(cat => (
                                                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setEditingContactId(contact.contactId)
                                                            setEditingField('category')
                                                        }}
                                                    >
                                                        {contact.category ? (
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                borderRadius: '12px',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                backgroundColor: getCategoryColor(contact.category) + '20',
                                                                color: getCategoryColor(contact.category)
                                                            }}>
                                                                {contact.category}
                                                            </span>
                                                        ) : '-'}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.status && (
                                            <td style={{ padding: '16px' }}>
                                                {editingContactId === contact.contactId && editingField === 'status' ? (
                                                    <select
                                                        defaultValue={contact.status}
                                                        onChange={(e) => {
                                                            handleInlineEdit(contact.contactId, 'status', e.target.value)
                                                        }}
                                                        onBlur={() => {
                                                            setEditingContactId(null)
                                                            setEditingField(null)
                                                        }}
                                                        autoFocus
                                                        style={{
                                                            width: '100%',
                                                            padding: '4px 8px',
                                                            border: '2px solid #DE1785',
                                                            borderRadius: '4px',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {statusOptions.map(status => (
                                                            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setEditingContactId(contact.contactId)
                                                            setEditingField('status')
                                                        }}
                                                    >
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            backgroundColor: getStatusColor(contact.status) + '20',
                                                            color: getStatusColor(contact.status)
                                                        }}>
                                                            <span style={{
                                                                width: '6px',
                                                                height: '6px',
                                                                borderRadius: '50%',
                                                                backgroundColor: getStatusColor(contact.status)
                                                            }} />
                                                            {contact.status}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.lastActivity && (
                                            <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                                                {new Date(contact.lastActivityAt).toLocaleDateString()}
                                            </td>
                                        )}
                                        {visibleColumns.notes && (
                                            <td style={{ padding: '16px' }}>
                                                {editingContactId === contact.contactId && editingField === 'notes' ? (
                                                    <textarea
                                                        defaultValue={contact.notes || ''}
                                                        onBlur={(e) => handleInlineEdit(contact.contactId, 'notes', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault()
                                                                e.currentTarget.blur()
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
                                                            minHeight: '40px'
                                                        }}
                                                    />
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            setEditingContactId(contact.contactId)
                                                            setEditingField('notes')
                                                        }}
                                                        style={{ 
                                                            fontSize: '14px', 
                                                            color: '#6B7280',
                                                            maxWidth: '300px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={contact.notes}
                                                    >
                                                        {contact.notes || '-'}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setExpandedRowId(expandedRowId === contact.contactId ? null : contact.contactId)
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 20 20" fill="#6B7280">
                                                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRowId === contact.contactId && (
                                        <tr>
                                            <td colSpan={10} style={{ padding: '0', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                                                            Contact Details
                                                        </h3>
                                                        <div style={{   }}>
                                                            {contact.address && (
                                                                <div style={{ marginBottom: '8px' }}>
                                                                    <span style={{ fontSize: '12px', color: '#6B7280', marginRight: '8px' }}>Address:</span>
                                                                    <span style={{ fontSize: '14px', color: '#374151' }}>{contact.address}</span>
                                                                </div>
                                                            )}
                                                            <div style={{ marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '12px', color: '#6B7280', marginRight: '8px' }}>Created:</span>
                                                                <span style={{ fontSize: '14px', color: '#374151' }}>
                                                                    {new Date(contact.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div style={{ marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '12px', color: '#6B7280', marginRight: '8px' }}>Owner:</span>
                                                                <span style={{ fontSize: '14px', color: '#374151' }}>
                                                                    {contact.ownerId === user.userId ? 'You' : contact.ownerId}
                                                                </span>
                                                            </div>
                                                            {contact.participants.length > 0 && (
                                                                <div>
                                                                    <span style={{ fontSize: '12px', color: '#6B7280', marginRight: '8px' }}>Shared with:</span>
                                                                    <span style={{ fontSize: '14px', color: '#374151' }}>
                                                                        {contact.participants.length} user(s)
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                                                            Quick Actions
                                                        </h3>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => {
                                                                    if (contact.email) {
                                                                        window.location.href = `mailto:${contact.email}`
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
                                                                    opacity: contact.email ? 1 : 0.5
                                                                }}
                                                            >
                                                                Send Email
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (contact.phone) {
                                                                        window.location.href = `tel:${contact.phone}`
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
                                                                    opacity: contact.phone ? 1 : 0.5
                                                                }}
                                                            >
                                                                Call
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm(`Delete ${contact.firstName} ${contact.lastName}?`)) {
                                                                        setContacts(prev => prev.filter(c => c.contactId !== contact.contactId))
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    border: '1px solid #DC2626',
                                                                    borderRadius: '4px',
                                                                    background: '#fff',
                                                                    color: '#DC2626',
                                                                    fontSize: '13px',
                                                                    cursor: 'pointer'
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
            </div>

            {/* Create Contact Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        padding: '24px',
                        width: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
                            Create New Contact
                        </h2>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                    Company
                                </label>
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '4px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="">Select category</option>
                                        <option value="customer">Customer</option>
                                        <option value="lead">Lead</option>
                                        <option value="partner">Partner</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Contact['status'] }))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="on hold">On Hold</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false)
                                    setFormData({
                                        firstName: '',
                                        lastName: '',
                                        company: '',
                                        email: '',
                                        phone: '',
                                        address: '',
                                        category: '',
                                        status: 'active',
                                        notes: ''
                                    })
                                }}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '4px',
                                    background: '#fff',
                                    fontSize: '14px',
                                    cursor: 'pointer'
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
                                    cursor: 'pointer'
                                }}
                            >
                                Create Contact
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ContactsCRM