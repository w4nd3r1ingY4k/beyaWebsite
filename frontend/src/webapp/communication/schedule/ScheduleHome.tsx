import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, addHours, startOfDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { X, Clock, CalendarIcon, MapPin, Users, Edit2, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../../AuthContext';
import contactsService, { Contact } from '../../../services/contactsService';

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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      padding: '0 16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <button
          onClick={goToToday}
          style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#D9D9D9',
            backgroundColor: 'transparent',
            border: '1px solid #D9D9D9',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#DE1785';
            e.currentTarget.style.color = '#DE1785';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#D9D9D9';
            e.currentTarget.style.color = '#D9D9D9';
          }}
        >
          Today
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={goToBack}
            style={{
              padding: '8px',
              color: '#D9D9D9',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#DE1785'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#D9D9D9'}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNext}
            style={{
              padding: '8px',
              color: '#D9D9D9',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#DE1785'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#D9D9D9'}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '500',
          color: '#000505',
          margin: 0,
        }}>
          {label()}
        </h2>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#FBF7F7',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid #D9D9D9',
      }}>
        <button
          onClick={() => onView(Views.DAY)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: view === Views.DAY ? '#FFFBFA' : 'transparent',
            color: view === Views.DAY ? '#000505' : '#D9D9D9',
            boxShadow: view === Views.DAY ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
          }}
        >
          Day
        </button>
        <button
          onClick={() => onView(Views.WEEK)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: view === Views.WEEK ? '#FFFBFA' : 'transparent',
            color: view === Views.WEEK ? '#000505' : '#D9D9D9',
            boxShadow: view === Views.WEEK ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
          }}
        >
          Week
        </button>
        <button
          onClick={() => onView(Views.MONTH)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: view === Views.MONTH ? '#FFFBFA' : 'transparent',
            color: view === Views.MONTH ? '#000505' : '#D9D9D9',
            boxShadow: view === Views.MONTH ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 5, 5, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: '#FFFBFA',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '400px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 5, 5, 0.15)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '32px 32px 24px 32px',
          borderBottom: '1px solid #D9D9D9',
          position: 'relative',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '400',
            color: '#000505',
            margin: 0,
            paddingRight: '40px',
          }}>
            {event.title}
          </h2>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '32px',
              right: '32px',
              background: 'transparent',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#D9D9D9',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFB8DF';
              e.currentTarget.style.color = '#DE1785';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#D9D9D9';
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Date and Time */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}>
            <CalendarIcon size={18} color="#DE1785" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                color: '#D9D9D9',
                marginBottom: '4px',
              }}>
                Date & Time
              </div>
              <div style={{
                fontSize: '14px',
                color: '#000505',
              }}>
                {format(event.start, 'EEEE, MMMM d, yyyy')}
                {event.time && (
                  <span> at {event.time}</span>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <MapPin size={18} color="#DE1785" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: '#D9D9D9',
                  marginBottom: '4px',
                }}>
                  Location
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#000505',
                }}>
                  {event.location}
                </div>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <Users size={18} color="#DE1785" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: '#D9D9D9',
                  marginBottom: '4px',
                }}>
                  Attendees ({event.attendees.length})
                </div>
                <div>
                  {event.attendees.map((attendee, index) => (
                    <span key={index} style={{
                      display: 'inline-block',
                      backgroundColor: '#FFB8DF',
                      color: '#DE1785',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      marginRight: '6px',
                      marginTop: '4px',
                    }}>
                      {attendee}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}>
              <Edit2 size={18} color="#DE1785" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  color: '#D9D9D9',
                  marginBottom: '4px',
                }}>
                  Notes
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#000505',
                }}>
                  {event.notes}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 32px 32px 32px',
          borderTop: '1px solid #D9D9D9',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            style={{
              background: 'transparent',
              color: '#D9D9D9',
              border: '1px solid #D9D9D9',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#EF4444';
              e.currentTarget.style.color = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#D9D9D9';
              e.currentTarget.style.color = '#D9D9D9';
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={onEdit}
            style={{
              background: '#DE1785',
              color: '#FFFBFA',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#c21668'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#DE1785'}
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 5, 5, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        background: '#FFFBFA',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '500px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 5, 5, 0.15)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '32px 32px 24px 32px',
          borderBottom: '1px solid #D9D9D9',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '400',
              color: '#000505',
              margin: 0,
            }}>
              {event.id ? 'Edit Event' : 'New Event'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#D9D9D9',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFB8DF';
                e.currentTarget.style.color = '#DE1785';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#D9D9D9';
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Title */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px',
            }}>
              Event Title *
            </label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
              placeholder="Enter event title"
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
            />
          </div>

          {/* Date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#D9D9D9',
          }}>
            <CalendarIcon size={20} color="#DE1785" />
            <span style={{ fontSize: '14px' }}>
              {format(event.start, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Time */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px',
            }}>
              Time
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <Clock size={20} color="#DE1785" />
              <input
                type="text"
                value={editedEvent.time || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: '1px solid #D9D9D9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: '#FFFBFA',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                placeholder="e.g., 2:00 PM - 3:00 PM"
                onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px',
            }}>
              Location
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <MapPin size={20} color="#DE1785" />
              <input
                type="text"
                value={editedEvent.location || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: '1px solid #D9D9D9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: '#FFFBFA',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                placeholder="Add location"
                onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px',
            }}>
              Attendees
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <Users size={20} color="#DE1785" />
              <input
                type="text"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: '1px solid #D9D9D9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: '#FFFBFA',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                placeholder="Add attendee email"
                onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
              />
              <button
                onClick={addAttendee}
                style={{
                  padding: '16px',
                  backgroundColor: '#FFB8DF',
                  color: '#DE1785',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF9FD0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFB8DF'}
              >
                <Plus size={20} />
              </button>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {editedEvent.attendees?.map((attendee, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FBF7F7',
                  padding: '12px 16px',
                  borderRadius: '8px',
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: '#000505',
                  }}>
                    {attendee}
                  </span>
                  <button
                    onClick={() => removeAttendee(index)}
                    style={{
                      color: '#D9D9D9',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#D9D9D9'}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px',
            }}>
              Notes
            </label>
            <textarea
              value={editedEvent.notes || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                minHeight: '100px',
              }}
              rows={3}
              placeholder="Add notes or description"
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 32px 32px 32px',
          borderTop: '1px solid #D9D9D9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {event.id && (
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              style={{
                background: 'transparent',
                color: '#D9D9D9',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#EF4444';
                e.currentTarget.style.color = '#EF4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D9D9D9';
                e.currentTarget.style.color = '#D9D9D9';
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginLeft: 'auto',
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: '#D9D9D9',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#DE1785';
                e.currentTarget.style.color = '#DE1785';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D9D9D9';
                e.currentTarget.style.color = '#D9D9D9';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editedEvent.title.trim()}
              style={{
                background: editedEvent.title.trim() ? '#DE1785' : '#D9D9D9',
                color: '#FFFBFA',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: editedEvent.title.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (editedEvent.title.trim()) {
                  e.currentTarget.style.background = '#c21668';
                }
              }}
              onMouseLeave={(e) => {
                if (editedEvent.title.trim()) {
                  e.currentTarget.style.background = '#DE1785';
                }
              }}
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
const ScheduleHome: React.FC = () => {
  const { user } = useAuth();
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

  // Fetch contacts from v2 API
  useEffect(() => {
    if (user?.userId) {
      loadContacts();
    }
  }, [user?.userId]);

  const loadContacts = async () => {
    if (!user?.userId) return;
    
    try {
      setLoadingContacts(true);
      const response = await contactsService.listContacts(user.userId);
      setContacts(response.contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

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
      backgroundColor: '#DE1785',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      fontSize: currentView === Views.MONTH ? '0.75em' : '0.85em',
      padding: currentView === Views.MONTH ? '2px 6px' : '4px 8px',
      cursor: 'pointer',
    };
    return { style };
  }, [currentView]);

  // Custom event component for day/week views
  const EventComponent = ({ event }: { event: RBCEvent }) => {
    return (
      <div style={{ height: '100%', padding: '4px' }}>
        <div style={{ fontWeight: '500', fontSize: '14px' }}>{event.title}</div>
        {event.time && currentView !== Views.MONTH && (
          <div style={{ fontSize: '12px', opacity: 0.9 }}>{event.time}</div>
        )}
        {event.location && (
          <div style={{
            fontSize: '12px',
            opacity: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px',
          }}>
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
    return customer.name || 'Unnamed Customer';
  };

  if (loadingContacts) {
    return (
      <div style={{
        height: '100vh',
        width: '100%',
        backgroundColor: '#FFFBFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '120px',
        paddingTop: '60px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #D9D9D9',
          borderTop: '3px solid #DE1785',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#FFFBFA',
      paddingLeft: '120px',
      paddingRight: '40px',
      paddingTop: '100px',
      paddingBottom: '40px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Customer Dropdown */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '24px'
      }}>
        {/* Customer Dropdown */}
        <div style={{
          position: 'relative',
          minWidth: '250px'
        }} ref={dropdownRef}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#FFFBFA',
              border: '1px solid #D9D9D9',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setShowDropdown(!showDropdown)}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#DE1785'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
          >
            <span>{getCustomerDisplayName()}</span>
            <ChevronDown size={20} style={{ 
              transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)', 
              transition: 'transform 0.2s',
              color: '#DE1785'
            }} />
          </button>
          
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: '#FFFBFA',
              border: '1px solid #D9D9D9',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 20,
            }}>
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: selectedCustomerId === 'all' ? '#DE1785' : '#000505',
                  backgroundColor: selectedCustomerId === 'all' ? '#FFF7FB' : 'transparent',
                  fontWeight: selectedCustomerId === 'all' ? '500' : '400',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #FBF7F7',
                }}
                onClick={() => {
                  setSelectedCustomerId('all');
                  setShowDropdown(false);
                }}
                onMouseEnter={(e) => {
                  if (selectedCustomerId !== 'all') {
                    e.currentTarget.style.backgroundColor = '#FBF7F7';
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
              
              {contacts.map(contact => (
                <div
                  key={contact.contactId}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: selectedCustomerId === contact.contactId ? '#DE1785' : '#000505',
                    backgroundColor: selectedCustomerId === contact.contactId ? '#FFF7FB' : 'transparent',
                    fontWeight: selectedCustomerId === contact.contactId ? '500' : '400',
                    transition: 'background-color 0.2s',
                    borderBottom: '1px solid #FBF7F7',
                  }}
                  onClick={() => {
                    setSelectedCustomerId(contact.contactId);
                    setShowDropdown(false);
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCustomerId !== contact.contactId) {
                      e.currentTarget.style.backgroundColor = '#FBF7F7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCustomerId !== contact.contactId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500' }}>{contact.name}</div>
                    {contact.email && (
                      <div style={{ fontSize: '12px', color: '#D9D9D9' }}>{contact.email}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Calendar - Direct in base container */}
      <div style={{ flex: 1 }}>
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
          style={{
            height: 'calc(100vh - 220px)',
            backgroundColor: '#FFFBFA',
            borderRadius: '16px',
            border: '1px solid #D9D9D9',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        />
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

      {/* Custom CSS for Calendar Month View Fix */}
      <style>{`
        /* Fix month view styling */
        .rbc-calendar {
          font-family: inherit !important;
        }
        
        .rbc-month-view {
          border: none !important;
          background: transparent !important;
        }
        
        .rbc-month-header {
          border-bottom: 1px solid #D9D9D9 !important;
          background: #FBF7F7 !important;
        }
        
        .rbc-header {
          padding: 12px 8px !important;
          font-weight: 500 !important;
          color: #000505 !important;
          font-size: 14px !important;
          border-right: 1px solid #D9D9D9 !important;
          background: #FBF7F7 !important;
        }
        
        .rbc-header:last-child {
          border-right: none !important;
        }
        
        .rbc-month-row {
          border-bottom: 1px solid #D9D9D9 !important;
        }
        
        .rbc-month-row:last-child {
          border-bottom: none !important;
        }
        
        .rbc-date-cell {
          padding: 8px !important;
          border-right: 1px solid #D9D9D9 !important;
          background: #FFFBFA !important;
          min-height: 100px !important;
        }
        
        .rbc-date-cell:last-child {
          border-right: none !important;
        }
        
        .rbc-date-cell.rbc-off-range-bg {
          background: #FBF7F7 !important;
        }
        
        .rbc-date-cell > a {
          color: #000505 !important;
          font-weight: 500 !important;
          text-decoration: none !important;
        }
        
        .rbc-date-cell.rbc-off-range > a {
          color: #D9D9D9 !important;
        }
        
        .rbc-today {
          background: #FFF7FB !important;
        }
        
        .rbc-today > a {
          color: #DE1785 !important;
          font-weight: 600 !important;
        }
        
        .rbc-event {
          background: #DE1785 !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 4px 6px !important;
          font-size: 12px !important;
          margin: 1px 0 !important;
        }
        
        .rbc-event:hover {
          background: #c21668 !important;
        }
        
        .rbc-slot-selection {
          background: rgba(222, 23, 133, 0.1) !important;
          border: 1px solid #DE1785 !important;
        }
        
        /* Fix toolbar styling that might be inherited */
        .rbc-toolbar {
          display: none !important; /* We use custom toolbar */
        }
        
        /* Fix week and day view styling */
        .rbc-time-view .rbc-time-header {
          border-bottom: 1px solid #D9D9D9 !important;
        }
        
        .rbc-time-view .rbc-time-content {
          border-top: 1px solid #D9D9D9 !important;
        }
        
        .rbc-timeslot-group {
          border-bottom: 1px solid #F5F5F5 !important;
        }
        
        .rbc-time-slot {
          border-top: 1px solid #F5F5F5 !important;
        }
        
        .rbc-day-slot .rbc-time-slot {
          border-right: 1px solid #D9D9D9 !important;
        }
        
        .rbc-current-time-indicator {
          background-color: #DE1785 !important;
        }
      `}</style>
    </div>
  );
};

export default ScheduleHome;