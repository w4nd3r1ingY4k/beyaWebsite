// Frontend service for Contacts V2 API
import { API_ENDPOINTS } from '../config/api';

// Types matching the backend structure
export interface Contact {
  contactId: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata?: Record<string, any>;
  notes?: ContactNote[];
}

export interface ContactNote {
  noteId: string;
  body: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateContactPayload {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface UpdateContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface ListContactsResponse {
  operation: string;
  contacts: Contact[];
  nextKey?: string;
  count: number;
}

export interface FindContactResponse {
  operation: string;
  contacts: Contact[];
  count: number;
  email?: string;
  phone?: string;
}

class ContactsService {
  private baseURL: string;

  constructor() {
    // Force use of new contacts API for now
    this.baseURL = 'https://bij7as05n4.execute-api.us-east-1.amazonaws.com/prod';
    console.log('Contacts API Base URL:', this.baseURL);
  }

  // Create a new contact
  async createContact(payload: CreateContactPayload): Promise<Contact> {
    const response = await fetch(`${this.baseURL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create contact: ${response.status}`);
    }

    const result = await response.json();
    return result.contact;
  }

  // Get a specific contact by ID
  async getContact(userId: string, contactId: string): Promise<Contact> {
    const response = await fetch(`${this.baseURL}/contacts/${contactId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get contact: ${response.status}`);
    }

    const result = await response.json();
    return result.contact;
  }

  // Update a contact
  async updateContact(userId: string, contactId: string, updates: UpdateContactPayload): Promise<Contact> {
    const requestBody = {
      userId,
      updates,
    };
    
    console.log('Updating contact:', { contactId, userId, updates, requestBody });
    
    const response = await fetch(`${this.baseURL}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Update response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update error response:', errorText);
      throw new Error(`Failed to update contact: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.contact;
  }

  // Delete a contact
  async deleteContact(userId: string, contactId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/contacts/${contactId}?userId=${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete contact: ${response.status}`);
    }
  }

  // List contacts for a user
  async listContacts(userId: string, limit: number = 20, startKey?: string): Promise<ListContactsResponse> {
    let url = `${this.baseURL}/contacts?userId=${userId}&limit=${limit}`;
    if (startKey) {
      url += `&startKey=${encodeURIComponent(startKey)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list contacts: ${response.status}`);
    }

    return await response.json();
  }

  // Find contact by email (for inbox matching)
  async findContactByEmail(email: string, userId?: string): Promise<FindContactResponse> {
    let url = `${this.baseURL}/contacts/search/email?email=${encodeURIComponent(email)}`;
    if (userId) {
      url += `&userId=${userId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to find contact by email: ${response.status}`);
    }

    return await response.json();
  }

  // Find contact by phone (for inbox matching)
  async findContactByPhone(phone: string, userId?: string): Promise<FindContactResponse> {
    let url = `${this.baseURL}/contacts/search/phone?phone=${encodeURIComponent(phone)}`;
    if (userId) {
      url += `&userId=${userId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to find contact by phone: ${response.status}`);
    }

    return await response.json();
  }

  // Add a note to a contact
  async addNote(userId: string, contactId: string, body: string, createdBy?: string): Promise<ContactNote> {
    const response = await fetch(`${this.baseURL}/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        body,
        createdBy: createdBy || userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add note: ${response.status}`);
    }

    const result = await response.json();
    return result.note;
  }

  // Test connection to the contacts API
  async testConnection(): Promise<boolean> {
    try {
      // Try to create a test contact
      const testContact = await this.createContact({
        userId: 'test-connection',
        name: 'Test Contact',
        email: 'test@example.com',
      });

      // Clean up by deleting the test contact
      await this.deleteContact('test-connection', testContact.contactId);
      
      return true;
    } catch (error) {
      console.error('Contacts API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const contactsService = new ContactsService();
export default contactsService; 