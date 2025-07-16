import React from 'react';
import { Clock, AlertCircle, CheckCircle, User, Calendar } from 'lucide-react';
import { Ticket } from '../TicketsHome';
import { format } from 'date-fns';

interface TicketListProps {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  onSelectTicket: (ticket: Ticket) => void;
}

const styles = {
  container: {
    width: '380px',
    backgroundColor: 'white',
    borderRight: '1px solid #E5E7EB',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },
  listHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  listTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5563',
    margin: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  ticketItem: {
    padding: '16px 20px',
    borderBottom: '1px solid #F3F4F6',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    position: 'relative' as const,
  },
  ticketItemActive: {
    backgroundColor: '#FDF2F8',
    borderLeft: '3px solid #EC4899',
    paddingLeft: '17px',
  },
  ticketHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  ticketId: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  ticketTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
    lineHeight: '1.4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  ticketDescription: {
    fontSize: '13px',
    color: '#6B7280',
    lineHeight: '1.4',
    marginBottom: '8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  ticketMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6B7280',
  },
  statusBadge: (status: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...getStatusStyle(status),
  }),
  priorityBadge: (priority: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...getPriorityStyle(priority),
  }),
  emptyState: {
    padding: '48px 20px',
    textAlign: 'center' as const,
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: '14px',
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
      return <Clock size={12} />;
    case 'in_progress':
      return <AlertCircle size={12} />;
    case 'resolved':
    case 'closed':
      return <CheckCircle size={12} />;
    default:
      return null;
  }
}

function formatStatus(status: string): string {
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

const TicketList: React.FC<TicketListProps> = ({ tickets, selectedTicket, onSelectTicket }) => {
  return (
    <div style={styles.container}>
      <div style={styles.listHeader}>
        <h3 style={styles.listTitle}>All Tickets ({tickets.length})</h3>
      </div>

      {tickets.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>No tickets found</p>
        </div>
      ) : (
        tickets.map(ticket => {
          const isActive = selectedTicket?.id === ticket.id;
          
          return (
            <div
              key={ticket.id}
              style={{
                ...styles.ticketItem,
                ...(isActive ? styles.ticketItemActive : {}),
              }}
              onClick={() => onSelectTicket(ticket)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <div style={styles.ticketHeader}>
                <span style={styles.ticketId}>{ticket.id}</span>
                <span style={styles.priorityBadge(ticket.priority)}>
                  {ticket.priority.toUpperCase()}
                </span>
              </div>

              <h4 style={styles.ticketTitle}>{ticket.title}</h4>
              
              {ticket.description && (
                <p style={styles.ticketDescription}>{ticket.description}</p>
              )}

              <div style={styles.ticketMeta}>
                <span style={styles.statusBadge(ticket.status)}>
                  {getStatusIcon(ticket.status)}
                  {formatStatus(ticket.status)}
                </span>

                {ticket.assignee && (
                  <div style={styles.metaItem}>
                    <User size={12} />
                    <span>{ticket.assignee}</span>
                  </div>
                )}

                {ticket.due_date && (
                  <div style={styles.metaItem}>
                    <Calendar size={12} />
                    <span>{format(new Date(ticket.due_date), 'MMM d')}</span>
                  </div>
                )}

                <div style={styles.metaItem}>
                  <Clock size={12} />
                  <span>{format(new Date(ticket.updated_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TicketList; 