import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, ChevronDown, Clock, AlertCircle, CheckCircle, User } from 'lucide-react';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import TicketForm from './components/TicketForm';
import { useAuth } from '../../AuthContext';

// Types
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'under_review' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  reporter: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  customerId?: string;
  tags?: string[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  created_at: string;
  is_internal?: boolean;
}

// Styles - maintaining design consistency
const styles = {
  container: {
    height: '100vh',
    backgroundColor: '#F9FAFB',
    display: 'flex',
    flexDirection: 'column' as const,
    marginTop: '45px',
  },
  header: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    borderBottom: '1px solid #E5E7EB',
    padding: '16px 24px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  searchContainer: {
    position: 'relative' as const,
    width: '320px',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 36px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6B7280',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#EC4899',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  statsBar: {
    backgroundColor: 'white',
    padding: '16px 24px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    gap: '32px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    width: '20px',
    height: '20px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginLeft: '4px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};

const TicketsHome: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Load tickets from localStorage on mount
  useEffect(() => {
    const storedTickets = localStorage.getItem('beyaTickets');
    if (storedTickets) {
      try {
        setTickets(JSON.parse(storedTickets));
      } catch (error) {
        console.error('Error loading tickets:', error);
        setTickets([]);
      }
    }
  }, []);

  // Save tickets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('beyaTickets', JSON.stringify(tickets));
  }, [tickets]);

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filterPriority);
    }

    // Sort by updated_at (newest first)
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return filtered;
  }, [tickets, searchQuery, filterStatus, filterPriority]);

  // Statistics
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const urgent = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

    return { open, inProgress, resolved, urgent };
  }, [tickets]);

  // Handlers
  const handleCreateTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'reporter'>) => {
    const newTicket: Ticket = {
      ...ticketData,
      id: `TICKET-${Date.now()}`,
      reporter: user?.email || 'Unknown User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTickets(prev => [newTicket, ...prev]);
    setSelectedTicket(newTicket);
    setShowCreateForm(false);
  }, [user]);

  const handleUpdateTicket = useCallback((ticketId: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, ...updates, updated_at: new Date().toISOString() }
        : ticket
    ));

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, ...updates, updated_at: new Date().toISOString() } : null);
    }
  }, [selectedTicket]);

  const handleDeleteTicket = useCallback((ticketId: string) => {
    setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(null);
    }
  }, [selectedTicket]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>Tickets</h1>
            
            {/* Search */}
            <div style={styles.searchContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#EC4899';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={styles.headerActions}>
            {/* Filter Button */}
            <button
              style={styles.filterButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#EC4899';
                e.currentTarget.style.color = '#EC4899';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.color = '#374151';
              }}
            >
              <Filter size={16} />
              Filter
              <ChevronDown size={16} />
            </button>

            {/* Create Button */}
            <button
              onClick={() => setShowCreateForm(true)}
              style={styles.createButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DB2777'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
            >
              <Plus size={16} />
              New Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <Clock size={20} color="#3B82F6" />
          <span style={styles.statLabel}>Open</span>
          <span style={styles.statValue}>{stats.open}</span>
        </div>
        <div style={styles.statItem}>
          <AlertCircle size={20} color="#F59E0B" />
          <span style={styles.statLabel}>In Progress</span>
          <span style={styles.statValue}>{stats.inProgress}</span>
        </div>
        <div style={styles.statItem}>
          <CheckCircle size={20} color="#10B981" />
          <span style={styles.statLabel}>Resolved</span>
          <span style={styles.statValue}>{stats.resolved}</span>
        </div>
        <div style={styles.statItem}>
          <AlertCircle size={20} color="#EF4444" />
          <span style={styles.statLabel}>High Priority</span>
          <span style={styles.statValue}>{stats.urgent}</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Ticket List */}
        <TicketList
          tickets={filteredTickets}
          selectedTicket={selectedTicket}
          onSelectTicket={setSelectedTicket}
        />

        {/* Ticket Detail */}
        {selectedTicket && (
          <TicketDetail
            ticket={selectedTicket}
            onUpdateTicket={handleUpdateTicket}
            onDeleteTicket={handleDeleteTicket}
            onClose={() => setSelectedTicket(null)}
          />
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <TicketForm
          onSave={handleCreateTicket}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default TicketsHome; 