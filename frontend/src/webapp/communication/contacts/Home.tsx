// Real Contacts Page using contactsService
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../AuthContext';
import contactsService, { Contact, CreateContactPayload } from '../../../services/contactsService';

const ContactsCRM: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Redirect or show loading if no authenticated user
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        <p>Please log in to view contacts</p>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '8px 16px',
            background: '#DE1785',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [user.userId]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await contactsService.listContacts(user.userId);
      setContacts(response.contacts);
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async () => {
    if (!formData.name.trim()) return;

    try {
      setError(null);
      const payload: CreateContactPayload = {
        userId: user.userId,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      };

      await contactsService.createContact(payload);
      await loadContacts(); // Refresh list
      setShowCreateModal(false);
      setFormData({ name: '', email: '', phone: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      setError(null);
      await contactsService.deleteContact(user.userId, contactId);
      await loadContacts(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact');
    }
  };

  // Filter contacts based on search term
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(term) ||
      (contact.email && contact.email.toLowerCase().includes(term)) ||
      (contact.phone && contact.phone.includes(term))
    );
  }, [contacts, searchTerm]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        Loading contacts...
      </div>
    );
  }

  return (
    <div style={{
      height: '96vh',
      backgroundColor: '#F9FAFB',
      display: 'flex',
      flexDirection: 'column',
      marginTop: '4vh',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFBFA',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#111827' 
        }}>
          Contacts ({filteredContacts.length})
        </h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts..."
            style={{
              padding: '8px 16px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              width: '300px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#DE1785',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+</span>
            Add Contact
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          color: '#DC2626',
          padding: '12px 24px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {filteredContacts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#6B7280'
          }}>
            {searchTerm ? (
              <>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>🔍 No contacts found</p>
                <p>Try adjusting your search terms</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>👥 No contacts yet</p>
                <p>Create your first contact to get started!</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    background: '#DE1785',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '16px'
                  }}
                >
                  Create First Contact
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Name
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Email
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Phone
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Created
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    width: '100px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr 
                    key={contact.contactId}
                    style={{ 
                      borderBottom: '1px solid #F3F4F6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500', color: '#111827' }}>
                      {contact.name}
                    </td>
                    <td style={{ padding: '16px', color: '#6B7280' }}>
                      {contact.email ? (
                        <a 
                          href={`mailto:${contact.email}`} 
                          style={{ color: '#3B82F6', textDecoration: 'none' }}
                        >
                          {contact.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '16px', color: '#6B7280' }}>
                      {contact.phone ? (
                        <a 
                          href={`tel:${contact.phone}`} 
                          style={{ color: '#3B82F6', textDecoration: 'none' }}
                        >
                          {contact.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '16px', color: '#6B7280', fontSize: '14px' }}>
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteContact(contact.contactId)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #EF4444',
                          color: '#EF4444',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#EF4444';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#EF4444';
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h2 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '20px', 
              fontWeight: '600',
              color: '#111827'
            }}>
              Create New Contact
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="Enter contact name"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="Enter email address"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="Enter phone number"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', email: '', phone: '' });
                }}
                style={{
                  background: 'transparent',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContact}
                disabled={!formData.name.trim()}
                style={{
                  background: formData.name.trim() ? '#DE1785' : '#D1D5DB',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: formData.name.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsCRM;