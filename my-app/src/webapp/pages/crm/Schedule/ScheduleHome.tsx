import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo, View, NavigateAction } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, addHours, startOfDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { X, Clock, Calendar as CalendarIcon, MapPin, Users, Edit2, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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
}

interface EventsByDate {
  [dateKey: string]: EventData[];
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
    <div className="flex items-center justify-between mb-4 px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Today
        </button>
        <div className="flex items-center">
          <button
            onClick={goToBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNext}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 ml-4">{label()}</h2>
      </div>
      
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => onView(Views.DAY)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            view === Views.DAY
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => onView(Views.WEEK)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            view === Views.WEEK
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => onView(Views.MONTH)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            view === Views.MONTH
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 relative">
          <h2 className="text-xl font-semibold text-gray-900 pr-10">{event.title}</h2>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="flex items-start gap-3">
            <CalendarIcon size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-0.5">Date & Time</div>
              <div className="text-sm text-gray-900">
                {format(event.start, 'EEEE, MMMM d, yyyy')}
                {event.time && (
                  <span> at {event.time}</span>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">Location</div>
                <div className="text-sm text-gray-900">{event.location}</div>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">Attendees ({event.attendees.length})</div>
                <div>
                  {event.attendees.map((attendee, index) => (
                    <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-2 mt-1">
                      {attendee}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="flex items-start gap-3">
              <Edit2 size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-0.5">Notes</div>
                <div className="text-sm text-gray-900">{event.notes}</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
          <button
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              {event.id ? 'Edit Event' : 'New Event'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Event Title</label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
              placeholder="Enter event title"
            />
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarIcon size={20} />
            <span className="text-sm">
              {format(event.start, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Time */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Time</label>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-400" />
              <input
                type="text"
                value={editedEvent.time || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, time: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                placeholder="e.g., 2:00 PM - 3:00 PM"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Location</label>
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-gray-400" />
              <input
                type="text"
                value={editedEvent.location || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, location: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                placeholder="Add location"
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Attendees</label>
            <div className="flex items-center gap-2 mb-2">
              <Users size={20} className="text-gray-400" />
              <input
                type="text"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAttendee()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                placeholder="Add attendee email"
              />
              <button
                onClick={addAttendee}
                className="p-2 bg-pink-50 text-pink-500 hover:bg-pink-100 rounded-lg transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {editedEvent.attendees?.map((attendee, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-700">{attendee}</span>
                  <button
                    onClick={() => removeAttendee(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={editedEvent.notes || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors resize-none"
              rows={3}
              placeholder="Add notes or description"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between">
          {event.id && (
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-pink-500 text-white hover:bg-pink-600 rounded-lg transition-colors"
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
  const [eventsByDate, setEventsByDate] = useState<EventsByDate>({});
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<RBCEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Note: Using state instead of localStorage due to artifact restrictions
  useEffect(() => {
    // Initialize with some sample data
    const sampleData = {
      '2024-12-15': [{
        id: '1',
        title: 'Team Meeting',
        time: '2:00 PM - 3:00 PM',
        location: 'Conference Room A',
        attendees: ['john@example.com', 'jane@example.com'],
        notes: 'Weekly team sync'
      }],
      '2024-12-20': [{
        id: '2',
        title: 'Project Review',
        time: '10:00 AM - 11:30 AM',
        location: 'Office 205',
        attendees: ['manager@example.com'],
        notes: 'Q4 project review meeting'
      }]
    };
    setEventsByDate(sampleData);
  }, []);

  // Convert events to RBC format
  const rbEvents: RBCEvent[] = useMemo(() => {
    const out: RBCEvent[] = [];
    Object.entries(eventsByDate).forEach(([dateKey, events]) => {
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
  }, [eventsByDate, currentView]);

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
    setEventsByDate((prev) => {
      const copy = { ...prev };
      const existing = copy[dateKey] || [];
      
      if (selectedEvent!.id) {
        // Update existing
        copy[dateKey] = existing.map(e => 
          e.id === selectedEvent!.id ? eventData : e
        );
      } else {
        // Add new
        copy[dateKey] = [...existing, { ...eventData, id: Date.now().toString() }];
      }
      
      return copy;
    });
  }, [selectedEvent]);

  // Delete event
  const handleDeleteEvent = useCallback((eventId: string) => {
    const dateKey = formatDateKey(selectedEvent!.start);
    setEventsByDate((prev) => {
      const copy = { ...prev };
      copy[dateKey] = (copy[dateKey] || []).filter(e => e.id !== eventId);
      if (copy[dateKey].length === 0) {
        delete copy[dateKey];
      }
      return copy;
    });
  }, [selectedEvent]);

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
      <div className="h-full p-1">
        <div className="font-medium text-sm">{event.title}</div>
        {event.time && currentView !== Views.MONTH && (
          <div className="text-xs opacity-90">{event.time}</div>
        )}
        {event.location && (
          <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
            <MapPin size={12} />
            {event.location}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 py-4">
        <h1 className="text-2xl font-semibold text-gray-900 px-6">My Calendar</h1>
      </div>
      
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl shadow-sm h-full p-4">
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