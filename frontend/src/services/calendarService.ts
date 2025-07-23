// Calendar Service
// Handles calendar API calls and data management

import { API_ENDPOINTS } from '../config/api';

// ─── Types ───────────────────────────────────────────────────────────────

export interface CalendarEvent {
  eventId: string;
  userId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  eventType: 'appointment' | 'meeting' | 'reminder' | 'task';
  status: 'scheduled' | 'completed' | 'cancelled';
  contactIds: string[];
  description?: string;
  location?: string;
  reminders: CalendarReminder[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarReminder {
  reminderType: 'email' | 'push' | 'sms';
  minutesBefore: number;
}

export interface CreateEventRequest {
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  eventType?: 'appointment' | 'meeting' | 'reminder' | 'task';
  contactIds?: string[];
  description?: string;
  location?: string;
  reminders?: CalendarReminder[];
}

export interface UpdateEventRequest {
  eventId: string;
  userId: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  eventType?: 'appointment' | 'meeting' | 'reminder' | 'task';
  status?: 'scheduled' | 'completed' | 'cancelled';
  contactIds?: string[];
  description?: string;
  location?: string;
  reminders?: CalendarReminder[];
}

// ─── Calendar Service ───────────────────────────────────────────────────

class CalendarService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_ENDPOINTS.CALENDAR_API_BASE;
  }

  // ─── Event Management ─────────────────────────────────────────────────

  async createEvent(eventData: CreateEventRequest): Promise<CalendarEvent> {
    const response = await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.status}`);
    }

    const result = await response.json();
    return result.event;
  }

  async updateEvent(updateData: {
    userId: string;
    eventId: string;
    startTime: string;
    updates: {
      title?: string;
      startTime?: string;
      endTime?: string;
      eventType?: 'appointment' | 'meeting' | 'reminder' | 'task';
      status?: 'scheduled' | 'completed' | 'cancelled';
      contactIds?: string[];
      description?: string;
      location?: string;
      reminders?: CalendarReminder[];
    };
  }): Promise<CalendarEvent> {
    const response = await fetch(`${this.baseUrl}/events/${updateData.eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.status}`);
    }

    const result = await response.json();
    return result.event;
  }

  async deleteEvent(deleteData: {
    userId: string;
    eventId: string;
    startTime: string;
  }): Promise<void> {
    const { userId, eventId, startTime } = deleteData;
    const response = await fetch(`${this.baseUrl}/events/${eventId}?userId=${userId}&startTime=${encodeURIComponent(startTime)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
  }

  async getEvent(eventId: string, userId: string): Promise<CalendarEvent> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get event: ${response.status}`);
    }

    const result = await response.json();
    return result.event;
  }

  // ─── Calendar Views ───────────────────────────────────────────────────

  async getDayEvents(contactId: string, date: string): Promise<CalendarEvent[]> {
    const response = await fetch(`${this.baseUrl}/calendar/day?contactId=${contactId}&date=${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get day events: ${response.status}`);
    }

    const result = await response.json();
    return result.events || [];
  }

  async getWeekEvents(contactId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const response = await fetch(`${this.baseUrl}/calendar/week?contactId=${contactId}&startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get week events: ${response.status}`);
    }

    const result = await response.json();
    return result.events || [];
  }

  async getMonthEvents(userId: string, year: number, month: number): Promise<CalendarEvent[]> {
    const response = await fetch(`${this.baseUrl}/calendar/month?userId=${userId}&year=${year}&month=${month}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get month events: ${response.status}`);
    }

    const result = await response.json();
    return result.events || [];
  }

  // ─── Contact Integration ─────────────────────────────────────────────

  async getContactEvents(userId: string, contactId: string): Promise<CalendarEvent[]> {
    const response = await fetch(`${this.baseUrl}/calendar/contact?userId=${userId}&contactId=${contactId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get contact events: ${response.status}`);
    }

    const result = await response.json();
    return result.events || [];
  }

  // ─── Utility Functions ───────────────────────────────────────────────

  // Convert CalendarEvent to React Big Calendar format
  convertToRBCEvent(event: CalendarEvent) {
    return {
      id: event.eventId,
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      resource: {
        eventId: event.eventId,
        userId: event.userId,
        eventType: event.eventType,
        status: event.status,
        contactIds: event.contactIds,
        description: event.description,
        location: event.location,
        reminders: event.reminders,
      },
    };
  }

  // Get events for a date range (helper for React Big Calendar)
  async getEventsForRange(contactId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
    // Use week query for better efficiency if the range is a week or less
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      return this.getWeekEvents(contactId, startDate, endDate);
    }
    
    // For longer ranges, get events day by day
    const events: CalendarEvent[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      try {
        const dayEvents = await this.getDayEvents(contactId, dateStr);
        events.push(...dayEvents);
      } catch (error) {
        console.warn(`Failed to get events for ${dateStr}:`, error);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events;
  }
}

// Export a singleton instance
const calendarService = new CalendarService();
export default calendarService; 