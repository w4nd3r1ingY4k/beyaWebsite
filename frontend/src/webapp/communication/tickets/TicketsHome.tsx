import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, ChevronDown, Clock, AlertCircle, CheckCircle, User } from 'lucide-react';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import TicketForm from './components/TicketForm';
import { useAuth } from '../../AuthContext';
import SpaceSelector from '@/webapp/tasks/components/SpaceSelector';
import BoardView from '@/webapp/tasks/components/BoardView';
import tasksService from '@/services/tasksService';
import type { Task as BackendTask } from '@/services/tasksService';

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

// Add a minimal Task type for BoardView compatibility
interface BoardTask {
  id: string;
  boardId: string;
  spaceId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  assignee?: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  labels: string[];
  attachments: any[];
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

// Helper to map Task status to Ticket status
const mapTaskStatusToTicketStatus = (status: string): Ticket['status'] => {
  switch (status) {
    case 'pending': return 'open';
    case 'in_progress': return 'in_progress';
    case 'review': return 'under_review';
    case 'done': return 'resolved';
    case 'cancelled': return 'closed';
    default: return 'open';
  }
};
// Helper to map Ticket status to Task status (returns TaskStatus union)
const mapTicketStatusToTaskStatus = (status: Ticket['status']): BackendTask['status'] => {
  switch (status) {
    case 'open': return 'pending';
    case 'in_progress': return 'in_progress';
    case 'under_review': return 'review';
    case 'resolved': return 'done';
    case 'closed': return 'cancelled';
    default: return 'pending';
  }
};

const TicketsHome: React.FC = () => {
  const { user } = useAuth();
  // Add state for spaces, boards, and view mode
  const [spaces, setSpaces] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<any | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Add filter options
  const statusOptions: { value: Ticket['status'], label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];
  const priorityOptions: { value: Ticket['priority'], label: string }[] = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];
  const [filterStatuses, setFilterStatuses] = useState<Ticket['status'][]>([]);
  const [filterPriorities, setFilterPriorities] = useState<Ticket['priority'][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tickets from localStorage on mount
  useEffect(() => {
    const fetchTickets = async () => {
      if (!selectedBoard || !user) return;
      setLoading(true);
      setError(null);
      try {
        const tasks: BackendTask[] = await tasksService.getTasksByBoard(selectedBoard.id || selectedBoard.boardId, user.email);
        setTickets(tasks.map((task) => ({
          id: task.taskId,
          title: task.title,
          description: task.description || '',
          status: mapTaskStatusToTicketStatus(task.status),
          priority: task.priority as Ticket['priority'],
          assignee: task.assigneeId || '',
          reporter: task.reporterId || '',
          created_at: task.createdAt,
          updated_at: task.updatedAt,
          due_date: task.dueDate,
          customerId: (task as any).customerId,
          tags: task.tags || [],
        })));
      } catch (err: any) {
        setError(err.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [selectedBoard, user]);

  // Save tickets to localStorage whenever they change
  useEffect(() => {
    // No longer needed as tickets are fetched from backend
  }, [tickets]);

  // Load spaces, boards, and set defaults (mock or adapt as needed)
  useEffect(() => {
    // TODO: Replace with actual API/data
    const mockSpaces = [
      { id: 'support', name: 'Support', color: '#3B82F6', description: 'Support tickets' },
      { id: 'it', name: 'IT', color: '#10B981', description: 'IT tickets' },
    ];
    setSpaces(mockSpaces);
    setSelectedSpace(mockSpaces[0]);
  }, []);
  useEffect(() => {
    if (selectedSpace) {
      // TODO: Replace with actual API/data
      const mockBoards = [
        { id: 'main', spaceId: selectedSpace.id, name: 'Main Board', description: 'All tickets', columns: [
          { id: 'open', name: 'Open', status: 'open' },
          { id: 'in_progress', name: 'In Progress', status: 'in_progress' },
          { id: 'under_review', name: 'Under Review', status: 'under_review' },
          { id: 'resolved', name: 'Resolved', status: 'resolved' },
          { id: 'closed', name: 'Closed', status: 'closed' },
        ] },
      ];
      setBoards(mockBoards);
      setSelectedBoard(mockBoards[0]);
    }
  }, [selectedSpace]);

  // Update filteredTickets to use advanced filters
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
    // Status filter (multi-select)
    if (filterStatuses.length > 0) {
      filtered = filtered.filter(ticket => filterStatuses.includes(ticket.status));
    }
    // Priority filter (multi-select)
    if (filterPriorities.length > 0) {
      filtered = filtered.filter(ticket => filterPriorities.includes(ticket.priority));
    }
    // Sort by updated_at (newest first)
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return filtered;
  }, [tickets, searchQuery, filterStatuses, filterPriorities]);

  // Statistics
  const stats = useMemo(() => {
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const urgent = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

    return { open, inProgress, resolved, urgent };
  }, [tickets]);

  // Adapt tickets to BoardTask for BoardView
  const boardTasks: BoardTask[] = tickets.map(ticket => ({
    id: ticket.id,
    boardId: selectedBoard?.id || 'main',
    spaceId: selectedSpace?.id || 'support',
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    type: 'task',
    assignee: ticket.assignee,
    reporter: ticket.reporter,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    tags: ticket.tags || [],
    labels: [],
    attachments: [],
  }));

  // Adapter handlers for BoardView
  const handleBoardSelectTask = (task: BoardTask) => {
    const ticket = tickets.find(t => t.id === task.id);
    if (ticket) setSelectedTicket(ticket);
  };
  const handleBoardUpdateTask = (taskId: string, updates: Partial<BoardTask>) => {
    // Only allow updates to fields that exist on Ticket
    const ticketUpdates: Partial<Ticket> = {
      title: updates.title,
      description: updates.description,
      status: updates.status as Ticket['status'],
      priority: updates.priority as Ticket['priority'],
      assignee: updates.assignee,
      tags: updates.tags,
    };
    handleUpdateTicket(taskId, ticketUpdates);
  };
  const handleBoardDeleteTask = (taskId: string) => {
    handleDeleteTicket(taskId);
  };
  const handleBoardCreateTask = (taskData: Partial<BoardTask>) => {
    // Only allow creation with fields that exist on Ticket
    const ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'reporter'> = {
      title: taskData.title || '',
      description: taskData.description || '',
      status: (taskData.status as Ticket['status']) || 'open',
      priority: (taskData.priority as Ticket['priority']) || 'medium',
      assignee: taskData.assignee,
      tags: taskData.tags || [],
      customerId: undefined,
      due_date: undefined,
    };
    handleCreateTicket(ticketData);
  };

  // Handlers
  const handleCreateTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'reporter'>) => {
    if (!selectedBoard || !selectedSpace || !user) return;
    setLoading(true);
    setError(null);
    try {
      const newTask = await tasksService.createTask({
        boardId: selectedBoard.id || selectedBoard.boardId,
        spaceId: selectedSpace.id || selectedSpace.spaceId,
        title: ticketData.title,
        description: ticketData.description,
        status: mapTicketStatusToTaskStatus(ticketData.status),
        priority: ticketData.priority as BackendTask['priority'],
        assigneeId: ticketData.assignee,
        reporterId: user.email,
        tags: ticketData.tags || [],
        dueDate: ticketData.due_date,
      });
      const newTicket: Ticket = {
        id: newTask.taskId,
        title: newTask.title,
        description: newTask.description || '',
        status: mapTaskStatusToTicketStatus(newTask.status),
        priority: newTask.priority as Ticket['priority'],
        assignee: newTask.assigneeId || '',
        reporter: newTask.reporterId || '',
        created_at: newTask.createdAt,
        updated_at: newTask.updatedAt,
        due_date: newTask.dueDate,
        customerId: (newTask as any).customerId,
        tags: newTask.tags || [],
      };
      setTickets(prev => [newTicket, ...prev]);
      setSelectedTicket(newTicket);
      setShowCreateForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  }, [selectedBoard, selectedSpace, user]);

  const handleUpdateTicket = useCallback(async (ticketId: string, updates: Partial<Ticket>) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const updatedTask = await tasksService.updateTask(ticketId, user.email, {
        title: updates.title,
        description: updates.description,
        status: updates.status ? mapTicketStatusToTaskStatus(updates.status) : undefined,
        priority: updates.priority as BackendTask['priority'],
        assigneeId: updates.assignee,
        tags: updates.tags,
        dueDate: updates.due_date,
      });
      setTickets(prev => prev.map(ticket =>
        ticket.id === ticketId
          ? {
              ...ticket,
              ...updates,
              status: updates.status ? updates.status : ticket.status,
              updated_at: updatedTask.updatedAt,
            }
          : ticket
      ));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, ...updates, status: updates.status ? updates.status : prev.status, updated_at: updatedTask.updatedAt } : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket');
    } finally {
      setLoading(false);
    }
  }, [user, selectedTicket]);

  const handleDeleteTicket = useCallback(async (ticketId: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Implement deleteTask in tasksService if not present
      if (typeof tasksService.deleteTask === 'function') {
        await tasksService.deleteTask(ticketId, user.email);
      } else {
        // fallback: just remove from UI
        setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
      }
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete ticket');
    } finally {
      setLoading(false);
    }
  }, [user, selectedTicket]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>Tickets</h1>
            {/* Space Selector */}
            <SpaceSelector
              spaces={spaces}
              selectedSpace={selectedSpace}
              onSelectSpace={setSelectedSpace}
            />
          </div>
          <div style={styles.headerActions}>
            {/* View Mode Button Group */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: viewMode === 'kanban' ? 'none' : '1.5px solid #EC4899',
                  background: viewMode === 'kanban' ? '#EC4899' : '#fff',
                  color: viewMode === 'kanban' ? '#fff' : '#EC4899',
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >Kanban</button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: viewMode === 'list' ? 'none' : '1.5px solid #EC4899',
                  background: viewMode === 'list' ? '#EC4899' : '#fff',
                  color: viewMode === 'list' ? '#fff' : '#EC4899',
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >List</button>
              <button
                onClick={() => setViewMode('calendar')}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: viewMode === 'calendar' ? 'none' : '1.5px solid #EC4899',
                  background: viewMode === 'calendar' ? '#EC4899' : '#fff',
                  color: viewMode === 'calendar' ? '#fff' : '#EC4899',
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >Calendar</button>
            </div>
          </div>
        </div>
      </div>
      {/* Advanced Filters */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <div>
          <span style={{ fontWeight: 500, color: '#EC4899', marginRight: 8 }}>Status:</span>
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatuses(s => s.includes(opt.value) ? s.filter(v => v !== opt.value) : [...s, opt.value])}
              style={{
                marginRight: 6,
                padding: '4px 12px',
                borderRadius: 16,
                border: filterStatuses.includes(opt.value) ? 'none' : '1.5px solid #EC4899',
                background: filterStatuses.includes(opt.value) ? '#EC4899' : '#fff',
                color: filterStatuses.includes(opt.value) ? '#fff' : '#EC4899',
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div>
          <span style={{ fontWeight: 500, color: '#EC4899', marginRight: 8 }}>Priority:</span>
          {priorityOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterPriorities(s => s.includes(opt.value) ? s.filter(v => v !== opt.value) : [...s, opt.value])}
              style={{
                marginRight: 6,
                padding: '4px 12px',
                borderRadius: 16,
                border: filterPriorities.includes(opt.value) ? 'none' : '1.5px solid #EC4899',
                background: filterPriorities.includes(opt.value) ? '#EC4899' : '#fff',
                color: filterPriorities.includes(opt.value) ? '#fff' : '#EC4899',
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>
      {/* Loading/Error States */}
      {loading && <div style={{ padding: 16, color: '#EC4899', fontWeight: 500 }}>Loading...</div>}
      {error && <div style={{ padding: 16, color: '#EF4444', fontWeight: 500 }}>{error}</div>}
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
      {/* Main Content: BoardView replaces TicketList */}
      <div style={styles.mainContent}>
        {selectedBoard && viewMode === 'kanban' && (
          <BoardView
            board={selectedBoard}
            tasks={boardTasks}
            viewMode={viewMode}
            onSelectTask={handleBoardSelectTask}
            onUpdateTask={handleBoardUpdateTask}
            onDeleteTask={handleBoardDeleteTask}
            onCreateTask={handleBoardCreateTask}
          />
        )}
        {viewMode === 'list' && (
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, margin: 24, padding: 24, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.07)' }}>
            <h2 style={{ color: '#EC4899', fontWeight: 600, fontSize: 20, marginBottom: 16 }}>List View</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ background: '#FDF2F8', color: '#EC4899' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Priority</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Assignee</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>No tickets found</td></tr>
                ) : (
                  filteredTickets.map(ticket => (
                    <tr
                      key={ticket.id}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #F3F4F6', background: selectedTicket?.id === ticket.id ? '#FDF2F8' : 'transparent' }}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td style={{ padding: '8px 8px', color: '#6B7280', fontWeight: 500 }}>{ticket.id}</td>
                      <td style={{ padding: '8px 8px', color: '#111827' }}>{ticket.title}</td>
                      <td style={{ padding: '8px 8px', color: '#6B7280' }}>{ticket.status.replace('_', ' ')}</td>
                      <td style={{ padding: '8px 8px', color: '#EC4899', fontWeight: 500 }}>{ticket.priority.toUpperCase()}</td>
                      <td style={{ padding: '8px 8px', color: '#6B7280' }}>{ticket.assignee || 'Unassigned'}</td>
                      <td style={{ padding: '8px 8px', color: '#6B7280' }}>{new Date(ticket.updated_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === 'calendar' && (
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, margin: 24, padding: 24, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.07)' }}>
            <h2 style={{ color: '#EC4899', fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Calendar View</h2>
            {/* Simple calendar grid for current month */}
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              const startDayOfWeek = firstDay.getDay();
              const daysInMonth = lastDay.getDate();
              const weeks: any[][] = [[]];
              let week = 0;
              // Fill initial empty days
              for (let i = 0; i < startDayOfWeek; i++) {
                weeks[week].push(null);
              }
              // Fill days with tickets
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayTickets = filteredTickets.filter(t => t.due_date && new Date(t.due_date).getFullYear() === year && new Date(t.due_date).getMonth() === month && new Date(t.due_date).getDate() === day);
                weeks[week].push({ day, tickets: dayTickets });
                if (weeks[week].length === 7) {
                  week++;
                  weeks[week] = [];
                }
              }
              // Fill trailing empty days
              while (weeks[weeks.length - 1].length < 7) {
                weeks[weeks.length - 1].push(null);
              }
              return (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, marginTop: 12 }}>
                  <thead>
                    <tr style={{ background: '#FDF2F8', color: '#EC4899' }}>
                      <th style={{ padding: 6 }}>Sun</th>
                      <th style={{ padding: 6 }}>Mon</th>
                      <th style={{ padding: 6 }}>Tue</th>
                      <th style={{ padding: 6 }}>Wed</th>
                      <th style={{ padding: 6 }}>Thu</th>
                      <th style={{ padding: 6 }}>Fri</th>
                      <th style={{ padding: 6 }}>Sat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week, i) => (
                      <tr key={i}>
                        {week.map((cell, j) => (
                          <td key={j} style={{
                            minWidth: 80,
                            height: 70,
                            verticalAlign: 'top',
                            border: '1px solid #F3F4F6',
                            background: cell && cell.day === now.getDate() ? '#FDF2F8' : '#fff',
                            padding: 6,
                          }}>
                            {cell && (
                              <div>
                                <div style={{ fontWeight: 600, color: '#EC4899', marginBottom: 4 }}>{cell.day}</div>
                                {cell.tickets.map((ticket: any) => (
                                  <div
                                    key={ticket.id}
                                    style={{
                                      background: '#EC4899',
                                      color: '#fff',
                                      borderRadius: 6,
                                      padding: '2px 6px',
                                      marginBottom: 2,
                                      fontSize: 13,
                                      cursor: 'pointer',
                                      fontWeight: 500,
                                    }}
                                    onClick={() => setSelectedTicket(ticket)}
                                  >
                                    {ticket.title.length > 16 ? ticket.title.slice(0, 16) + '…' : ticket.title}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}
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