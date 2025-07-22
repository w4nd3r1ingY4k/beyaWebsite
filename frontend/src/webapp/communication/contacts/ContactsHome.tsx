import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import contactsService, { Contact, CreateContactPayload, UpdateContactPayload } from '../../../services/contactsService';
import './ContactsHome.css';

interface ContactsHomeState {
  contacts: Contact[];
  loading: boolean;
  searchTerm: string;
  showCreateModal: boolean;
  editingContact: Contact | null;
  error: string | null;
}

const ContactsHome: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ContactsHomeState>({
    contacts: [],
    loading: true,
    searchTerm: '',
    showCreateModal: false,
    editingContact: null,
    error: null
  });

  // Use real user ID from auth context
  const userId = user?.userId;

  useEffect(() => {
    if (userId) {
      loadContacts();
    }
  }, [userId]);

  const loadContacts = async () => {
    if (!userId) return;
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await contactsService.listContacts(userId);
      setState(prev => ({ 
        ...prev, 
        contacts: response.contacts, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load contacts', 
        loading: false 
      }));
    }
  };

  const handleCreateContact = async (contactData: CreateContactPayload) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await contactsService.createContact(contactData);
      await loadContacts(); // Refresh list
      setState(prev => ({ ...prev, showCreateModal: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to create contact' }));
    }
  };

  const handleUpdateContact = async (contactId: string, updates: UpdateContactPayload) => {
    if (!userId) return;
    
    try {
      setState(prev => ({ ...prev, error: null }));
      await contactsService.updateContact(userId, contactId, updates);
      await loadContacts(); // Refresh list
      setState(prev => ({ ...prev, editingContact: null }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to update contact' }));
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?') || !userId) return;
    
    try {
      setState(prev => ({ ...prev, error: null }));
      await contactsService.deleteContact(userId, contactId);
      await loadContacts(); // Refresh list
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to delete contact' }));
    }
  };

  const filteredContacts = state.contacts.filter(contact =>
    contact.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    (contact.email && contact.email.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
    (contact.phone && contact.phone.includes(state.searchTerm))
  );

  if (state.loading) {
    return (
      <div className="contacts-home">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="contacts-home">
      <div className="contacts-header">
        <h1>Contacts</h1>
        <button 
          className="btn-primary"
          onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
        >
          <span>+</span>
          Add Contact
        </button>
      </div>

      {state.error && (
        <div className="error-banner">
          {state.error}
        </div>
      )}

      <div className="contacts-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search contacts..."
            value={state.searchTerm}
            onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="search-input"
          />
        </div>
      </div>

      <div className="contacts-list">
        {filteredContacts.length === 0 ? (
          <div className="empty-state">
            {state.searchTerm ? (
              <>
                <p>🔍 No contacts match your search</p>
                <p>Try adjusting your search terms or check the spelling</p>
              </>
            ) : (
              <>
                <p>👥 No contacts yet</p>
                <p>Add your first contact to get started!</p>
                <button 
                  className="btn-primary"
                  onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                  style={{ marginTop: '16px' }}
                >
                  <span>+</span>
                  Add Your First Contact
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="contacts-table-container">
            <table className="contacts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <ContactRow
                    key={contact.contactId}
                    contact={contact}
                    onEdit={(contact) => setState(prev => ({ ...prev, editingContact: contact }))}
                    onDelete={handleDeleteContact}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {state.showCreateModal && (
        <ContactModal
          mode="create"
          userId={userId}
          onSave={handleCreateContact}
          onCancel={() => setState(prev => ({ ...prev, showCreateModal: false }))}
        />
      )}

      {state.editingContact && (
        <ContactModal
          mode="edit"
          userId={userId}
          contact={state.editingContact}
          onSave={(data) => handleUpdateContact(state.editingContact!.contactId, data)}
          onCancel={() => setState(prev => ({ ...prev, editingContact: null }))}
        />
      )}
    </div>
  );
};

// Contact Row Component for Table
interface ContactRowProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

const ContactRow: React.FC<ContactRowProps> = ({ contact, onEdit, onDelete }) => {
  return (
    <tr className="contact-row">
      <td className="contact-name">
        <div className="name-cell">
          <span className="name-text">{contact.name}</span>
        </div>
      </td>
      <td className="contact-email">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="email-link">
            {contact.email}
          </a>
        ) : (
          <span className="no-data">—</span>
        )}
      </td>
      <td className="contact-phone">
        {contact.phone ? (
          <a href={`tel:${contact.phone}`} className="phone-link">
            {contact.phone}
          </a>
        ) : (
          <span className="no-data">—</span>
        )}
      </td>
      <td className="contact-notes">
        {contact.notes && contact.notes.length > 0 ? (
          <span className="notes-count">{contact.notes.length} notes</span>
        ) : (
          <span className="no-data">—</span>
        )}
      </td>
      <td className="contact-actions">
        <div className="action-buttons">
          <button 
            className="btn-secondary btn-small"
            onClick={() => onEdit(contact)}
            title="Edit contact"
          >
            ✏️
          </button>
          <button 
            className="btn-danger btn-small"
            onClick={() => onDelete(contact.contactId)}
            title="Delete contact"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
};

// Contact Modal Component
interface ContactModalProps {
  mode: 'create' | 'edit';
  userId: string;
  contact?: Contact;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ mode, userId, contact, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    if (mode === 'create') {
      onSave({
        userId,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined
      });
    } else {
      onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Add Contact' : 'Edit Contact'}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactsHome; 