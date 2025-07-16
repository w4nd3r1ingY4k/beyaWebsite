import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, addHours, startOfDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { X, Clock, CalendarIcon, MapPin, Users, Edit2, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { API_ENDPOINTS } from '../../../config/api';

// ─────────── Constants ───────────
const API_BASE = API_ENDPOINTS.SCHEDULE_API_BASE;

// ─────────── Date-Fns Localizer Setup ───────────
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse: (value: string, formatString: string) => parse(value, formatString, new Date()),
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales,
});

// ─────────── Utility Functions ───────────
function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─────────── Types ───────────
interface Contact {
  contactId: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
}

// ─────────── Enhanced Event Format ───────────
interface EventData {
  id: string;
  title: string;
  time?: string;
  location?: string;
  attendees?: string[];
  notes?: string;
  customerId?: string; // Added to associate with customer
}

interface EventsByCustomer {
  [customerId: string]: {
    [dateKey: string]: EventData[];
  };
}

interface RBCEvent extends EventData {
  start: Date;
  end: Date;
  allDay: boolean;
}

// ─────────── Style Constants ───────────
const styles = {
  container: {
    marginTop: '45px',
    height: '100vh',
    backgroundColor: '#F9FAFB',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    borderBottom: '1px solid #E5E7EB',
    padding: '16px 0',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  customerDropdown: {
    position: 'relative' as const,
    minWidth: '250px',
  },
  dropdownButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
    overflowY: 'auto' as const,
    zIndex: 20,
  },
  dropdownItem: {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid #F3F4F6',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  dropdownItemSelected: {
    backgroundColor: '#FDF2F8',
    color: '#EC4899',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    padding: '24px',
  },
  calendarWrapper: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    height: '100%',
    padding: '16px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    padding: '0 16px',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  todayButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  navButton: {
    padding: '8px',
    color: '#4B5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  monthLabel: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  viewSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#F3F4F6',
    padding: '4px',
    borderRadius: '8px',
  },
  viewButton: (isActive: boolean) => ({
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: isActive ? 'white' : 'transparent',
    color: isActive ? '#111827' : '#4B5563',
    boxShadow: isActive ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }),
  modal: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: '16px',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxWidth: '512px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  modalHeader: {
    padding: '24px',
    borderBottom: '1px solid #F3F4F6',
  },
  modalHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  modalBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  input: {
    width: '100%',
    padding: '8px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '8px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s',
    resize: 'none' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box' as const,
  },
  iconRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#4B5563',
  },
  attendeeInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  addButton: {
    padding: '8px',
    backgroundColor: '#FDF2F8',
    color: '#EC4899',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  attendeeList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  attendeeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  attendeeText: {
    fontSize: '14px',
    color: '#374151',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  removeButton: {
    color: '#9CA3AF',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  modalFooter: {
    padding: '24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    color: '#DC2626',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
  },
  cancelButton: {
    padding: '8px 16px',
    color: '#4B5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 24px',
    backgroundColor: '#EC4899',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  eventComponent: {
    height: '100%',
    padding: '4px',
  },
  eventTitle: {
    fontWeight: '500',
    fontSize: '14px',
  },
  eventTime: {
    fontSize: '12px',
    opacity: 0.9,
  },
  eventLocation: {
    fontSize: '12px',
    opacity: 0.75,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#6B7280',
    fontSize: '14px',
  },
};

// ─────────── Custom Toolbar Component ───────────
const CustomToolbar = ({ date, view, onView, onNavigate }: any) => {
  const goToBack = () => onNavigate('PREV');
  const goToNext = () => onNavigate('NEXT');
  const goToToday = () => onNavigate('TODAY');

  const label = () => {
    const d = date;
    if (view === Views.DAY) return format(d, 'EEEE, MMMM d, yyyy');
    if (view === Views.WEEK) return `Week of ${format(d, 'MMMM d, yyyy')}`;
    return format(d, 'MMMM yyyy');
  };

  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarLeft}>
        <button
          onClick={goToToday}
          style={styles.todayButton}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          Today
        </button>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={goToBack}
            style={styles.navButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNext}
            style={styles.navButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <h2 style={styles.monthLabel}>{label()}</h2>
      </div>
      
      <div style={styles.viewSwitcher}>
        <button
          onClick={() => onView(Views.DAY)}
          style={styles.viewButton(view === Views.DAY)}
          onMouseEnter={(e) => {
            if (view !== Views.DAY) e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            if (view !== Views.DAY) e.currentTarget.style.color = '#4B5563';
          }}
        >
          Day
        </button>
        <button
          onClick={() => onView(Views.WEEK)}
          style={styles.viewButton(view === Views.WEEK)}
          onMouseEnter={(e) => {
            if (view !== Views.WEEK) e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            if (view !== Views.WEEK) e.currentTarget.style.color = '#4B5563';
          }}
        >
          Week
        </button>
        <button
          onClick={() => onView(Views.MONTH)}
          style={styles.viewButton(view === Views.MONTH)}
          onMouseEnter={(e) => {
            if (view !== Views.MONTH) e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            if (view !== Views.MONTH) e.currentTarget.style.color = '#4B5563';
          }}
        >
          Month
        </button>
      </div>
    </div>
  );
};

// ─────────── Event Summary Modal Component ───────────
const EventSummaryModal = ({ event, onClose, onEdit, onDelete }: {
  event: RBCEvent | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (eventId: string) => void;
}) => {
  if (!event) return null;

  const summaryStyles = {
    modal: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '16px',
    },
    content: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      width: '100%',
    },
    header: {
      padding: '20px 24px',
      borderBottom: '1px solid #F3F4F6',
      position: 'relative' as const,
    },
    closeButton: {
      position: 'absolute' as const,
      top: '20px',
      right: '20px',
      padding: '8px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827',
      margin: 0,
      paddingRight: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    body: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    infoRow: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    },
    icon: {
      marginTop: '2px',
      flexShrink: 0,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: '12px',
      color: '#6B7280',
      marginBottom: '2px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    infoText: {
      fontSize: '14px',
      color: '#111827',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    attendeeChip: {
      display: 'inline-block',
      backgroundColor: '#F3F4F6',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      marginRight: '6px',
      marginTop: '4px',
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #F3F4F6',
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
    },
    actionButton: {
      padding: '8px 16px',
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    primaryButton: {
      padding: '8px 16px',
      backgroundColor: '#EC4899',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    deleteButton: {
      padding: '8px 16px',
      backgroundColor: 'white',
      color: '#DC2626',
      border: '1px solid #FCA5A5',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
  };

  return (
    <div style={summaryStyles.modal} onClick={onClose}>
      <div style={summaryStyles.content} onClick={(e) => e.stopPropagation()}>
        <div style={summaryStyles.header}>
          <h2 style={summaryStyles.title}>{event.title}</h2>
          <button
            onClick={onClose}
            style={summaryStyles.closeButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} color="#6B7280" />
          </button>
        </div>

        <div style={summaryStyles.body}>
          {/* Date and Time */}
          <div style={summaryStyles.infoRow}>
            <CalendarIcon size={18} color="#6B7280" style={summaryStyles.icon} />
            <div style={summaryStyles.infoContent}>
              <div style={summaryStyles.infoLabel}>Date & Time</div>
              <div style={summaryStyles.infoText}>
                {format(event.start, 'EEEE, MMMM d, yyyy')}
                {event.time && (
                  <span> at {event.time}</span>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div style={summaryStyles.infoRow}>
              <MapPin size={18} color="#6B7280" style={summaryStyles.icon} />
              <div style={summaryStyles.infoContent}>
                <div style={summaryStyles.infoLabel}>Location</div>
                <div style={summaryStyles.infoText}>{event.location}</div>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div style={summaryStyles.infoRow}>
              <Users size={18} color="#6B7280" style={summaryStyles.icon} />
              <div style={summaryStyles.infoContent}>
                <div style={summaryStyles.infoLabel}>Attendees ({event.attendees.length})</div>
                <div>
                  {event.attendees.map((attendee, index) => (
                    <span key={index} style={summaryStyles.attendeeChip}>
                      {attendee}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div style={summaryStyles.infoRow}>
              <Edit2 size={18} color="#6B7280" style={summaryStyles.icon} />
              <div style={summaryStyles.infoContent}>
                <div style={summaryStyles.infoLabel}>Notes</div>
                <div style={summaryStyles.infoText}>{event.notes}</div>
              </div>
            </div>
          )}
        </div>

        <div style={summaryStyles.footer}>
          <button
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            style={summaryStyles.deleteButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
              e.currentTarget.style.borderColor = '#F87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#FCA5A5';
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={onEdit}
            style={summaryStyles.primaryButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DB2777'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
          >
            <Edit2 size={14} />
            Edit Event
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────── Event Modal Component ───────────
const EventModal = ({ event, onClose, onSave, onDelete }: {
  event: RBCEvent | null;
  onClose: () => void;
  onSave: (event: EventData) => void;
  onDelete: (eventId: string) => void;
}) => {
  const [editedEvent, setEditedEvent] = useState<EventData>(
    event || {
      id: Date.now().toString(),
      title: '',
      time: '',
      location: '',
      attendees: [],
      notes: ''
    }
  );
  const [attendeeInput, setAttendeeInput] = useState('');

  if (!event) return null;

  const handleSave = () => {
    if (editedEvent.title.trim()) {
      onSave(editedEvent);
      onClose();
    }
  };

  const addAttendee = () => {
    if (attendeeInput.trim()) {
      setEditedEvent({
        ...editedEvent,
        attendees: [...(editedEvent.attendees || []), attendeeInput.trim()]
      });
      setAttendeeInput('');
    }
  };

  const removeAttendee = (index: number) => {
    setEditedEvent({
      ...editedEvent,
      attendees: editedEvent.attendees?.filter((_, i) => i !== index) || []
    });
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderRow}>
            <h2 style={styles.modalTitle}>
              {event.id ? 'Edit Event' : 'New Event'}
            </h2>
            <button
              onClick={onClose}
              style={styles.closeButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={20} color="#6B7280" />
            </button>
          </div>
        </div>

        <div style={styles.modalBody}>
          {/* Title */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Event Title</label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              style={styles.input}
              placeholder="Enter event title"
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

          {/* Date */}
          <div style={styles.dateDisplay}>
            <CalendarIcon size={20} />
            <span style={{ fontSize: '14px' }}>
              {format(event.start, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Time */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Time</label>
            <div style={styles.iconRow}>
              <Clock size={20} color="#9CA3AF" />
              <input
                type="text"
                value={editedEvent.time || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })}
                style={{ ...styles.input, flex: 1 }}
                placeholder="e.g., 2:00 PM - 3:00 PM"
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

          {/* Location */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Location</label>
            <div style={styles.iconRow}>
              <MapPin size={20} color="#9CA3AF" />
              <input
                type="text"
                value={editedEvent.location || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                style={{ ...styles.input, flex: 1 }}
                placeholder="Add location"
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

          {/* Attendees */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Attendees</label>
            <div style={styles.attendeeInput}>
              <Users size={20} color="#9CA3AF" />
              <input
                type="text"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                style={{ ...styles.input, flex: 1 }}
                placeholder="Add attendee email"
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
                onClick={addAttendee}
                style={styles.addButton}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FCE7F3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FDF2F8'}
              >
                <Plus size={20} />
              </button>
            </div>
            <div style={styles.attendeeList}>
              {editedEvent.attendees?.map((attendee, index) => (
                <div key={index} style={styles.attendeeItem}>
                  <span style={styles.attendeeText}>{attendee}</span>
                  <button
                    onClick={() => removeAttendee(index)}
                    style={styles.removeButton}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={editedEvent.notes || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
              style={styles.textarea}
              rows={3}
              placeholder="Add notes or description"
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

        {/* Actions */}
        <div style={styles.modalFooter}>
          {event.id && (
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              style={styles.deleteButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <div style={styles.buttonGroup}>
            <button
              onClick={onClose}
              style={styles.cancelButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={styles.saveButton}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DB2777'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EC4899'}
            >
              <Edit2 size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────── Main Calendar Component ───────────
const CalendarPage: React.FC = () => {
  const [eventsByCustomer, setEventsByCustomer] = useState<EventsByCustomer>({});
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<RBCEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  // Customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Mock auth context (replace with actual auth)
  const user = {
    userId: 'user123',
    displayName: 'John Doe',
    email: 'john@example.com',
  };
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const response = await fetch(`${API_BASE}/contacts?limit=100`);
        if (!response.ok) throw new Error('Failed to fetch contacts');
        
        const data = await response.json();
        const mappedContacts: Contact[] = data.contacts.map((raw: any) => ({
          contactId: raw.GoldenContactID || `contact_${Date.now()}_${Math.random()}`,
          firstName: raw.FIRST_NAME || '',
          lastName: raw.LAST_NAME || '',
          company: raw.COMPANY || raw['Default.company'] || '',
          email: raw.PRIMARY_EMAIL || raw.EMAIL_1 || '',
        }));
        
        setContacts(mappedContacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    };
    
    fetchContacts();
  }, []);

  // Load events from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('calendarEventsByCustomer');
    if (stored) {
      try {
        setEventsByCustomer(JSON.parse(stored));
      } catch {
        // Try to migrate from old format
        const oldStored = localStorage.getItem('calendarEventsEnhanced');
        if (oldStored) {
          try {
            const oldData = JSON.parse(oldStored);
            // Migrate to new format - put all old events under 'all'
            const migrated: EventsByCustomer = {
              all: oldData
            };
            setEventsByCustomer(migrated);
          } catch {
            setEventsByCustomer({});
          }
        }
      }
    }
  }, []);

  // Persist events to localStorage
  useEffect(() => {
    localStorage.setItem('calendarEventsByCustomer', JSON.stringify(eventsByCustomer));
  }, [eventsByCustomer]);

  // Get current customer's events
  const currentCustomerEvents = useMemo(() => {
    if (selectedCustomerId === 'all') {
      // Aggregate all events from all customers
      const allEvents: { [dateKey: string]: EventData[] } = {};
      Object.values(eventsByCustomer).forEach(customerEvents => {
        Object.entries(customerEvents).forEach(([dateKey, events]) => {
          if (!allEvents[dateKey]) {
            allEvents[dateKey] = [];
          }
          allEvents[dateKey].push(...events);
        });
      });
      return allEvents;
    }
    return eventsByCustomer[selectedCustomerId] || {};
  }, [eventsByCustomer, selectedCustomerId]);

  // Convert events to RBC format
  const rbEvents: RBCEvent[] = useMemo(() => {
    const out: RBCEvent[] = [];
    Object.entries(currentCustomerEvents).forEach(([dateKey, events]) => {
      const dayStart = parseISO(dateKey);
      events.forEach((event) => {
        // Parse time if available for day/week views
        let start = dayStart;
        let end = dayStart;
        let allDay = true;

        if (event.time && currentView !== Views.MONTH) {
          // Simple time parsing (e.g., "2:00 PM" -> 14:00)
          const timeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const isPM = timeMatch[3]?.toUpperCase() === 'PM';
            
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
            
            start = new Date(dayStart);
            start.setHours(hours, minutes, 0, 0);
            end = addHours(start, 1); // Default 1 hour duration
            allDay = false;
          }
        }

        out.push({
          ...event,
          start,
          end,
          allDay,
        });
      });
    });
    return out;
  }, [currentCustomerEvents, currentView]);

  // Handle slot selection
  const handleSelectSlot = useCallback(({ start }: SlotInfo) => {
    const newEvent: RBCEvent = {
      id: '',
      title: '',
      start,
      end: start,
      allDay: currentView === Views.MONTH,
    };
    setSelectedEvent(newEvent);
    setShowModal(true);
  }, [currentView]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: RBCEvent) => {
    setSelectedEvent(event);
    setShowSummaryModal(true);
  }, []);

  // Save event
  const handleSaveEvent = useCallback((eventData: EventData) => {
    const dateKey = formatDateKey(selectedEvent!.start);
    const customerId = selectedCustomerId === 'all' ? 'all' : selectedCustomerId;
    
    setEventsByCustomer((prev) => {
      const copy = { ...prev };
      if (!copy[customerId]) {
        copy[customerId] = {};
      }
      const existing = copy[customerId][dateKey] || [];
      
      if (selectedEvent!.id) {
        // Update existing
        copy[customerId][dateKey] = existing.map(e => 
          e.id === selectedEvent!.id ? { ...eventData, customerId } : e
        );
      } else {
        // Add new
        copy[customerId][dateKey] = [...existing, { ...eventData, id: Date.now().toString(), customerId }];
      }
      
      return copy;
    });
  }, [selectedEvent, selectedCustomerId]);

  // Delete event
  const handleDeleteEvent = useCallback((eventId: string) => {
    const dateKey = formatDateKey(selectedEvent!.start);
    
    setEventsByCustomer((prev) => {
      const copy = { ...prev };
      
      // If viewing all, find which customer owns this event
      if (selectedCustomerId === 'all') {
        Object.keys(copy).forEach(customerId => {
          if (copy[customerId][dateKey]) {
            copy[customerId][dateKey] = copy[customerId][dateKey].filter(e => e.id !== eventId);
            if (copy[customerId][dateKey].length === 0) {
              delete copy[customerId][dateKey];
            }
          }
        });
      } else {
        // Delete from specific customer
        if (copy[selectedCustomerId] && copy[selectedCustomerId][dateKey]) {
          copy[selectedCustomerId][dateKey] = copy[selectedCustomerId][dateKey].filter(e => e.id !== eventId);
          if (copy[selectedCustomerId][dateKey].length === 0) {
            delete copy[selectedCustomerId][dateKey];
          }
        }
      }
      
      return copy;
    });
  }, [selectedEvent, selectedCustomerId]);

  // Event styling
  const eventStyleGetter = useCallback((event: RBCEvent) => {
    const style: React.CSSProperties = {
      backgroundColor: '#EC4899',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      fontSize: currentView === Views.MONTH ? '0.75em' : '0.85em',
      padding: currentView === Views.MONTH ? '2px 4px' : '4px 8px',
      cursor: 'pointer',
    };
    return { style };
  }, [currentView]);

  // Custom event component for day/week views
  const EventComponent = ({ event }: { event: RBCEvent }) => {
    return (
      <div style={styles.eventComponent}>
        <div style={styles.eventTitle}>{event.title}</div>
        {event.time && currentView !== Views.MONTH && (
          <div style={styles.eventTime}>{event.time}</div>
        )}
        {event.location && (
          <div style={styles.eventLocation}>
            <MapPin size={12} />
            {event.location}
          </div>
        )}
      </div>
    );
  };

  // Get selected customer display name
  const getCustomerDisplayName = () => {
    if (selectedCustomerId === 'all') return 'All Customers';
    const customer = contacts.find(c => c.contactId === selectedCustomerId);
    if (!customer) return 'Select Customer';
    const name = `${customer.firstName} ${customer.lastName}`.trim();
    return name || customer.company || 'Unnamed Customer';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>Schedule</h1>
          
          {/* Customer Dropdown */}
          <div style={styles.customerDropdown} ref={dropdownRef}>
            <button
              style={styles.dropdownButton}
              onClick={() => setShowDropdown(!showDropdown)}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EC4899'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
            >
              <span>{getCustomerDisplayName()}</span>
              <ChevronDown size={20} style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            
            {showDropdown && (
              <div style={styles.dropdownMenu}>
                <div
                  style={{
                    ...styles.dropdownItem,
                    ...(selectedCustomerId === 'all' ? styles.dropdownItemSelected : {})
                  }}
                  onClick={() => {
                    setSelectedCustomerId('all');
                    setShowDropdown(false);
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCustomerId !== 'all') {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCustomerId !== 'all') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  All Customers
                </div>
                
                {loadingContacts ? (
                  <div style={styles.loadingContainer}>Loading contacts...</div>
                ) : (
                  contacts.map(contact => {
                    const displayName = `${contact.firstName} ${contact.lastName}`.trim() || contact.company || 'Unnamed';
                    return (
                      <div
                        key={contact.contactId}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedCustomerId === contact.contactId ? styles.dropdownItemSelected : {})
                        }}
                        onClick={() => {
                          setSelectedCustomerId(contact.contactId);
                          setShowDropdown(false);
                        }}
                        onMouseEnter={(e) => {
                          if (selectedCustomerId !== contact.contactId) {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedCustomerId !== contact.contactId) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '500' }}>{displayName}</div>
                          {contact.company && (
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>{contact.company}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div style={styles.mainContent}>
        <div style={styles.calendarWrapper}>
          <Calendar
            localizer={localizer}
            events={rbEvents}
            startAccessor="start"
            endAccessor="end"
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            views={[Views.DAY, Views.WEEK, Views.MONTH]}
            defaultView={Views.MONTH}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: CustomToolbar,
              event: EventComponent,
            }}
            popup
            step={60}
            timeslots={1}
            min={new Date(0, 0, 0, 6, 0, 0)}
            max={new Date(0, 0, 0, 22, 0, 0)}
            dayLayoutAlgorithm="no-overlap"
          />
        </div>
      </div>

      {showSummaryModal && (
        <EventSummaryModal
          event={selectedEvent}
          onClose={() => {
            setShowSummaryModal(false);
            setSelectedEvent(null);
          }}
          onEdit={() => {
            setShowSummaryModal(false);
            setShowModal(true);
          }}
          onDelete={handleDeleteEvent}
        />
      )}

      {showModal && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowModal(false);
            setSelectedEvent(null);
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default CalendarPage;