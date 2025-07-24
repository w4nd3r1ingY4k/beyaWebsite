import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, CheckCircle, User, Calendar, MessageSquare, Trash2, Edit3, ChevronDown, Send } from 'lucide-react';
import { Ticket, TicketComment } from '../TicketsHome';
import { format } from 'date-fns';
import { useAuth } from '../../../AuthContext';
import modalStyles from '@/styles/TicketDetailModal.module.css';

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
    <div className={modalStyles.backdrop} onClick={onClose}>
      <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={modalStyles.header}>
          <div className={modalStyles.headerLeft}>
            <span className={modalStyles.ticketId}>{ticket.id}</span>
            <span className={modalStyles.statusBadge + ' ' + modalStyles[ticket.status]}>
              {getStatusIcon(ticket.status)}
              {ticket.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </span>
            <span className={modalStyles.priorityBadge + ' ' + modalStyles[ticket.priority]}>
              {ticket.priority.toUpperCase()}
            </span>
          </div>
          <div className={modalStyles.headerActions}>
            <button
              className={modalStyles.deleteButton}
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this ticket?')) {
                  onDeleteTicket(ticket.id);
                }
              }}
            >
              <Trash2 size={18} />
            </button>
            <button
              className={modalStyles.iconButton}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className={modalStyles.content}>
          {/* Title & Description */}
          <div className={modalStyles.section}>
            <h2 className={modalStyles.title}>{ticket.title}</h2>
            <p className={modalStyles.description}>{ticket.description}</p>
          </div>
          {/* Metadata */}
          <div className={modalStyles.section}>
            <h3 className={modalStyles.sectionTitle}>Details</h3>
            <div className={modalStyles.metaGrid}>
              {/* Status */}
              <div className={modalStyles.metaItem}>
                <span className={modalStyles.metaLabel}>Status</span>
                <div className={modalStyles.dropdown}>
                  <button
                    className={modalStyles.dropdownButton}
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  >
                    <span>{ticket.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    <ChevronDown size={16} />
                  </button>
                  {showStatusDropdown && (
                    <div className={modalStyles.dropdownMenu}>
                      {statusOptions.map(status => (
                        <div
                          key={status}
                          className={modalStyles.dropdownItem}
                          onClick={() => handleStatusChange(status)}
                        >
                          {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Priority */}
              <div className={modalStyles.metaItem}>
                <span className={modalStyles.metaLabel}>Priority</span>
                <div className={modalStyles.dropdown}>
                  <button
                    className={modalStyles.dropdownButton}
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  >
                    <span>{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</span>
                    <ChevronDown size={16} />
                  </button>
                  {showPriorityDropdown && (
                    <div className={modalStyles.dropdownMenu}>
                      {priorityOptions.map(priority => (
                        <div
                          key={priority}
                          className={modalStyles.dropdownItem}
                          onClick={() => handlePriorityChange(priority)}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Reporter */}
              <div className={modalStyles.metaItem}>
                <span className={modalStyles.metaLabel}>Reporter</span>
                <span className={modalStyles.metaValue}>{ticket.reporter}</span>
              </div>
              {/* Assignee */}
              <div className={modalStyles.metaItem}>
                <span className={modalStyles.metaLabel}>Assignee</span>
                <span className={modalStyles.metaValue}>{ticket.assignee || 'Unassigned'}</span>
              </div>
              {/* Created */}
              <div className={modalStyles.metaItem}>
                <span className={modalStyles.metaLabel}>Created</span>
                <span className={modalStyles.metaValue}>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {/* Due Date */}
              <div className={modalStyles.metaItem}>
                <span className={modalStyles.metaLabel}>Due Date</span>
                <span className={modalStyles.metaValue}>
                  {ticket.due_date ? format(new Date(ticket.due_date), 'MMM d, yyyy') : 'No due date'}
                </span>
              </div>
            </div>
          </div>
          {/* Comments */}
          <div className={modalStyles.commentsSection}>
            <h3 className={modalStyles.sectionTitle}>
              <MessageSquare size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Discussion ({comments.length})
            </h3>
            <div className={modalStyles.commentsList}>
              {comments.map(comment => (
                <div key={comment.id} className={modalStyles.comment}>
                  <div className={modalStyles.commentHeader}>
                    <span className={modalStyles.commentAuthor}>{comment.user_name}</span>
                    <span className={modalStyles.commentTime}>{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className={modalStyles.commentText}>{comment.comment}</p>
                </div>
              ))}
            </div>
            <div className={modalStyles.commentInput}>
              <textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className={modalStyles.textarea}
              />
              <button
                className={modalStyles.sendButton}
                onClick={handleAddComment}
              >
                <Send size={16} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail; 