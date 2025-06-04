// src/CalendarPage.tsx
import React, { useState, useEffect, useCallback } from 'react';

// Utility to format a JS Date as YYYY-MM-DD
function formatDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Month names and weekday names
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Inline styles for various parts of the calendar
const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#374151',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    padding: '16px',
    backgroundColor: '#FFFBFA',
    minHeight: '100vh',
    boxSizing: 'border-box' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%',
    maxWidth: '800px',
    marginBottom: '16px',
  },
  navButton: {
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'background 0.2s',
  },
  navLabel: {
    fontSize: '18px',
    fontWeight: 600 as const,
    textAlign: 'center' as const,
    flex: 1,
  },
  weekdayRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '4px',
  },
  weekdayCell: {
    textAlign: 'center' as const,
    padding: '8px 0',
    fontSize: '14px',
    fontWeight: 600 as const,
    color: '#4B5563',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: '100px',
    gap: '1px',
    backgroundColor: '#E5E7EB',
    width: '100%',
    maxWidth: '800px',
  },
  dayCell: {
    backgroundColor: '#ffffff',
    position: 'relative' as const,
    cursor: 'pointer',
    overflow: 'hidden' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-start' as const,
    padding: '4px',
    boxSizing: 'border-box' as const,
  },
  dayNumber: {
    fontSize: '14px',
    fontWeight: 500 as const,
    color: '#1F2937',
  },
  eventDotsContainer: {
    marginTop: 'auto',
    display: 'flex',
    gap: '4px',
    paddingBottom: '4px',
  },
  eventDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#DE1785',
  },
  tooltip: {
    position: 'absolute' as const,
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '6px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    pointerEvents: 'none' as const,
    whiteSpace: 'pre-wrap' as const,
    zIndex: 1000,
    maxWidth: '120px',
    textAlign: 'left' as const,
  },
};

interface EventsByDate {
  [dateKey: string]: string[];
}

const CalendarPage: React.FC = () => {
  // 1) Track current year/month (0-indexed month)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // 2) Load existing events from localStorage (if any)
  const [eventsByDate, setEventsByDate] = useState<EventsByDate>({});

  useEffect(() => {
    const stored = localStorage.getItem('calendarEvents');
    if (stored) {
      try {
        setEventsByDate(JSON.parse(stored));
      } catch {
        setEventsByDate({});
      }
    }
  }, []);

  // 3) Persist events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendarEvents', JSON.stringify(eventsByDate));
  }, [eventsByDate]);

  // 4) Compute the days to render for the current month view
  const generateCalendarMatrix = useCallback(() => {
    // a) First day of this month
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const weekdayOfFirst = firstOfMonth.getDay(); // 0=Sun, 6=Sat
    // b) Number of days in this month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // c) Build array of Date objects (or null) for each cell, starting from Sunday
    const matrix: (Date | null)[] = [];
    // Prepend blanks until first-of-month’s weekday
    for (let i = 0; i < weekdayOfFirst; i++) {
      matrix.push(null);
    }
    // Add each date of this month
    for (let day = 1; day <= daysInMonth; day++) {
      matrix.push(new Date(currentYear, currentMonth, day));
    }
    // After inserting all days, fill remaining cells to complete the last week row
    while (matrix.length % 7 !== 0) {
      matrix.push(null);
    }
    return matrix;
  }, [currentYear, currentMonth]);

  const calendarMatrix = generateCalendarMatrix();

  // 5) Handlers for Prev/Next month buttons
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // 6) Day‐cell click: either add or manage existing events
  const onDayClick = (dateObj: Date) => {
    const key = formatDateKey(dateObj);
    const existing = eventsByDate[key] || [];

    if (existing.length === 0) {
      // No events yet → prompt to add one
      const newEvent = window.prompt(`Add an event for ${key}:`);
      if (newEvent && newEvent.trim()) {
        setEventsByDate((prev) => ({
          ...prev,
          [key]: [newEvent.trim()],
        }));
      }
    } else {
      // There are existing events: show them, let user remove or add
      const list = existing.map((e, i) => `${i + 1}. ${e}`).join('\n');
      const action = window.prompt(
        `Events on ${key}:\n${list}\n\nType the number to delete, or type a new event to append:\n(Leave blank or Cancel to dismiss)`
      );
      if (!action) return; // user cancelled or empty
      // If action is a number, delete that event
      const maybeIndex = parseInt(action, 10);
      if (
        !isNaN(maybeIndex) &&
        maybeIndex >= 1 &&
        maybeIndex <= existing.length
      ) {
        const idx = maybeIndex - 1;
        const updated = [...existing];
        updated.splice(idx, 1);
        setEventsByDate((prev) => {
          const copy = { ...prev };
          if (updated.length === 0) {
            delete copy[key];
          } else {
            copy[key] = updated;
          }
          return copy;
        });
      } else {
        // Otherwise treat it as a new event string
        const newEvent = action.trim();
        if (newEvent.length > 0) {
          setEventsByDate((prev) => ({
            ...prev,
            [key]: [...existing, newEvent],
          }));
        }
      }
    }
  };

  // 7) Hover tooltip state
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Render
  return (
    <div style={styles.container}>
      {/* Header: Month navigation */}
      <div style={styles.header}>
        <button
          style={styles.navButton}
          onClick={goToPrevMonth}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ‹ Prev
        </button>
        <div style={styles.navLabel}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </div>
        <button
          style={styles.navButton}
          onClick={goToNextMonth}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Next ›
        </button>
      </div>

      {/* Weekday header */}
      <div style={styles.weekdayRow}>
        {WEEKDAY_NAMES.map((wd) => (
          <div key={wd} style={styles.weekdayCell}>
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={styles.calendarGrid}>
        {calendarMatrix.map((cell, idx) => {
          if (!cell) {
            // Empty cell
            return <div key={idx} style={{ backgroundColor: '#F9FAFB' }} />;
          }

          const dateKey = formatDateKey(cell);
          const events = eventsByDate[dateKey] || [];

          return (
            <div
              key={idx}
              style={styles.dayCell}
              onClick={() => onDayClick(cell)}
              onMouseEnter={(e) => {
                if (events.length > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top + 4 });
                  setHoveredDateKey(dateKey);
                }
              }}
              onMouseLeave={() => {
                setHoveredDateKey(null);
                setTooltipPosition(null);
              }}
            >
              {/* Day number in top-left */}
              <div style={styles.dayNumber}>{cell.getDate()}</div>

              {/* Event dots at bottom */}
              {events.length > 0 && (
                <div style={styles.eventDotsContainer}>
                  {events.slice(0, 3).map((_, dotIdx) => (
                    <div key={dotIdx} style={styles.eventDot} />
                  ))}
                  {events.length > 3 && (
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>+{events.length - 3}</div>
                  )}
                </div>
              )}

              {/* Tooltip for events on hover */}
              {hoveredDateKey === dateKey && tooltipPosition && (
                <div
                  style={{
                    ...styles.tooltip,
                    top: tooltipPosition.y,
                    left: tooltipPosition.x,
                  }}
                >
                  {events.map((ev, i) => `• ${ev}`).join('\n')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarPage;