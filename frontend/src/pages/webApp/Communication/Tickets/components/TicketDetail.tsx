import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, CheckCircle, User, Calendar, MessageSquare, Trash2, Edit3, ChevronDown, Send } from 'lucide-react';
import { Ticket, TicketComment } from '../TicketsHome';
import { format } from 'date-fns';
import { useAuth } from '../../../../AuthContext';

interface TicketDetailProps {
  ticket: Ticket;
  onUpdateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  onDeleteTicket: (ticketId: string) => void;
  onClose: () => void;
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBFA',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },
  ticketId: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#DC2626',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  section: {
    padding: '24px',
    borderBottom: '1px solid #F3F4F6',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  description: {
    fontSize: '14px',
    color: '#4B5563',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  metaLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  metaValue: {
    fontSize: '14px',
    color: '#111827',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  dropdown: {
    position: 'relative' as const,
    width: '100%',
  },
  dropdownButton: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    maxHeight: '200px',
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  statusBadge: (status: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...getStatusStyle(status),
  }),
  priorityBadge: (priority: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...getPriorityStyle(priority),
  }),
  commentsSection: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  commentsList: {
    flex: 1,
    overflowY: 'auto' as const,
    marginBottom: '16px',
  },
  comment: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  commentTime: {
    fontSize: '12px',
    color: '#6B7280',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  commentText: {
    fontSize: '14px',
    color: '#4B5563',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  commentInput: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    padding: '10px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'none' as const,
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '80px',
  },
  sendButton: {
    padding: '10px 16px',
    backgroundColor: '#EC4899',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};

function getStatusStyle(status: string) {
  switch (status) {
    case 'open':
      return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'in_progress':
      return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'under_review':
      return { backgroundColor: '#E0E7FF', color: '#4338CA' };
    case 'resolved':
      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'closed':
      return { backgroundColor: '#F3F4F6', color: '#4B5563' };
    default:
      return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'urgent':
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    case 'high':
      return { backgroundColor: '#FED7AA', color: '#EA580C' };
    case 'medium':
      return { backgroundColor: '#FEF3C7', color: '#CA8A04' };
    case 'low':
      return { backgroundColor: '#E0E7FF', color: '#4338CA' };
    default:
      return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'open':
      return <Clock size={14} />;
    case 'in_progress':
      return <AlertCircle size={14} />;
    case 'resolved':
    case 'closed':
      return <CheckCircle size={14} />;
    default:
      return null;
  }
}

const TicketDetail: React.FC<TicketDetailProps> = ({ ticket, onUpdateTicket, onDeleteTicket, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Load comments from localStorage
  useEffect(() => {
    const storedComments = localStorage.getItem(`beyaTicketComments_${ticket.id}`);
    if (storedComments) {
      try {
        setComments(JSON.parse(storedComments));
      } catch (error) {
        console.error('Error loading comments:', error);
        setComments([]);
      }
    }
  }, [ticket.id]);

  // Save comments to localStorage
  const saveComments = (updatedComments: TicketComment[]) => {
    localStorage.setItem(`beyaTicketComments_${ticket.id}`, JSON.stringify(updatedComments));
    setComments(updatedComments);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: TicketComment = {
      id: `comment_${Date.now()}`,
      ticket_id: ticket.id,
      user_id: user?.userId || 'unknown',
      user_name: user?.email || 'Unknown User',
      comment: newComment.trim(),
      created_at: new Date().toISOString(),
      is_internal: false,
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);
    setNewComment('');
  };

  const handleStatusChange = (status: Ticket['status']) => {
    onUpdateTicket(ticket.id, { status });
    setShowStatusDropdown(false);
  };

  const handlePriorityChange = (priority: Ticket['priority']) => {
    onUpdateTicket(ticket.id, { priority });
    setShowPriorityDropdown(false);
  };

  const statusOptions: Ticket['status'][] = ['open', 'in_progress', 'under_review', 'resolved', 'closed'];
  const priorityOptions: Ticket['priority'][] = ['low', 'medium', 'high', 'urgent'];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.ticketId}>{ticket.id}</span>
          <span style={styles.statusBadge(ticket.status)}>
            {getStatusIcon(ticket.status)}
            {ticket.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
          <span style={styles.priorityBadge(ticket.priority)}>
            {ticket.priority.toUpperCase()}
          </span>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.deleteButton}
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this ticket?')) {
                onDeleteTicket(ticket.id);
              }
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 size={18} />
          </button>
          <button
            style={styles.iconButton}
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Title & Description */}
        <div style={styles.section}>
          <h2 style={styles.title}>{ticket.title}</h2>
          <p style={styles.description}>{ticket.description}</p>
        </div>

        {/* Metadata */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Details</h3>
          <div style={styles.metaGrid}>
            {/* Status */}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Status</span>
              <div style={styles.dropdown}>
                <button
                  style={styles.dropdownButton}
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                >
                  <span>{ticket.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                  <ChevronDown size={16} />
                </button>
                {showStatusDropdown && (
                  <div style={styles.dropdownMenu}>
                    {statusOptions.map(status => (
                      <div
                        key={status}
                        style={styles.dropdownItem}
                        onClick={() => handleStatusChange(status)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Priority</span>
              <div style={styles.dropdown}>
                <button
                  style={styles.dropdownButton}
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EC4899'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                >
                  <span>{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</span>
                  <ChevronDown size={16} />
                </button>
                {showPriorityDropdown && (
                  <div style={styles.dropdownMenu}>
                    {priorityOptions.map(priority => (
                      <div
                        key={priority}
                        style={styles.dropdownItem}
                        onClick={() => handlePriorityChange(priority)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reporter */}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Reporter</span>
              <span style={styles.metaValue}>{ticket.reporter}</span>
            </div>

            {/* Assignee */}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Assignee</span>
              <span style={styles.metaValue}>{ticket.assignee || 'Unassigned'}</span>
            </div>

            {/* Created */}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Created</span>
              <span style={styles.metaValue}>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>

            {/* Due Date */}
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Due Date</span>
              <span style={styles.metaValue}>
                {ticket.due_date ? format(new Date(ticket.due_date), 'MMM d, yyyy') : 'No due date'}
              </span>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div style={styles.commentsSection}>
          <h3 style={styles.sectionTitle}>
            <MessageSquare size={18} style={{ display: 'inline', marginRight: '8px' }} />
            Discussion ({comments.length})
          </h3>

          <div style={styles.commentsList}>
            {comments.map(comment => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>{comment.user_name}</span>
                  <span style={styles.commentTime}>{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <p style={styles.commentText}>{comment.comment}</p>
              </div>
            ))}
          </div>

          <div style={styles.commentInput}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={styles.textarea}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleAddComment();
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#EC4899';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleAddComment}
              style={styles.sendButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DB2777'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail; 