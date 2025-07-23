import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import contactsService, { Contact, CreateContactPayload, UpdateContactPayload } from '../../../services/contactsService';
import { Search, Plus, Mail, Phone, Edit2, Trash2, X, Check } from 'lucide-react';

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
      await loadContacts();
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
      await loadContacts();
      setState(prev => ({ ...prev, editingContact: null }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to update contact' }));
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm('Delete this contact?') || !userId) return;
    
    try {
      setState(prev => ({ ...prev, error: null }));
      await contactsService.deleteContact(userId, contactId);
      await loadContacts();
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
      <div style={{
        height: '100vh',
        width: '100%',
        backgroundColor: '#FFFBFA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '120px', // Account for side menu
        paddingTop: '60px' // Account for top spacing
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
      paddingLeft: '120px', // Account for side menu (80px menu + 40px padding)
      paddingRight: '40px', // Right padding
      paddingTop: '100px', // Top padding (60px for status bar + 40px extra)
      paddingBottom: '40px', // Bottom padding
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            maxWidth: '400px',
            flex: '1'
          }}>
            <Search 
              size={20} 
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#D9D9D9'
              }}
            />
            <input
              type="text"
              placeholder="Search contacts..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
            />
          </div>

          <button
            onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
            style={{
              background: '#DE1785',
              color: '#FFFBFA',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(222, 23, 133, 0.2)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#c21668';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#DE1785';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={16} />
            Add Contact
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {filteredContacts.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#FFB8DF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <Mail size={32} color="#DE1785" />
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '400',
              color: '#000505',
              margin: '0 0 8px 0'
            }}>
              {state.searchTerm ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#D9D9D9',
              margin: '0 0 24px 0'
            }}>
              {state.searchTerm ? 'Try adjusting your search' : 'Add your first contact to get started'}
            </p>
            {!state.searchTerm && (
              <button
                onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                style={{
                  background: 'transparent',
                  color: '#DE1785',
                  border: '1px solid #DE1785',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#DE1785';
                  e.currentTarget.style.color = '#FFFBFA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#DE1785';
                }}
              >
                Create Your First Contact
              </button>
            )}
          </div>
        ) : (
          // Table View
          <div style={{
            backgroundColor: '#FFFBFA',
            border: '1px solid #D9D9D9',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(222, 23, 133, 0.1)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#FBF7F7',
                  borderBottom: '1px solid #D9D9D9'
                }}>
                  <th style={{
                    padding: '20px 24px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000505',
                    borderRight: '1px solid #D9D9D9'
                  }}>
                    Name
                  </th>
                  <th style={{
                    padding: '20px 24px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000505',
                    borderRight: '1px solid #D9D9D9'
                  }}>
                    Email
                  </th>
                  <th style={{
                    padding: '20px 24px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000505',
                    borderRight: '1px solid #D9D9D9'
                  }}>
                    Phone
                  </th>
                  <th style={{
                    padding: '20px 24px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000505',
                    borderRight: '1px solid #D9D9D9'
                  }}>
                    Created
                  </th>
                  <th style={{
                    padding: '20px 24px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000505',
                    width: '120px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact, index) => (
                  <tr 
                    key={contact.contactId}
                                         style={{
                       borderBottom: index < filteredContacts.length - 1 ? '1px solid #D9D9D9' : 'none',
                       transition: 'background-color 0.2s ease'
                     }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFF7FB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                                         <td style={{
                       padding: '20px 24px',
                       borderRight: '1px solid #D9D9D9'
                     }}>
                       <div style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '12px'
                       }}>
                         <div style={{
                           width: '36px',
                           height: '36px',
                           borderRadius: '50%',
                           backgroundColor: '#FFB8DF',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           fontSize: '14px',
                           fontWeight: '600',
                           color: '#DE1785'
                         }}>
                           {contact.name.charAt(0).toUpperCase()}
                         </div>
                         <span style={{
                           fontSize: '16px',
                           fontWeight: '500',
                           color: '#000505'
                         }}>
                           {contact.name}
                         </span>
                       </div>
                     </td>
                     <td style={{
                       padding: '20px 24px',
                       borderRight: '1px solid #D9D9D9'
                     }}>
                       {contact.email ? (
                         <a
                           href={`mailto:${contact.email}`}
                           style={{
                             fontSize: '14px',
                             color: '#DE1785',
                             textDecoration: 'none',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '8px'
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                           onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                         >
                           <Mail size={14} />
                           {contact.email}
                         </a>
                       ) : (
                         <span style={{ fontSize: '14px', color: '#D9D9D9' }}>—</span>
                       )}
                     </td>
                     <td style={{
                       padding: '20px 24px',
                       borderRight: '1px solid #D9D9D9'
                     }}>
                       {contact.phone ? (
                         <a
                           href={`tel:${contact.phone}`}
                           style={{
                             fontSize: '14px',
                             color: '#DE1785',
                             textDecoration: 'none',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '8px'
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                           onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                         >
                           <Phone size={14} />
                           {contact.phone}
                         </a>
                       ) : (
                         <span style={{ fontSize: '14px', color: '#D9D9D9' }}>—</span>
                       )}
                     </td>
                     <td style={{
                       padding: '20px 24px',
                       borderRight: '1px solid #D9D9D9'
                     }}>
                      <span style={{
                        fontSize: '14px',
                        color: '#000505'
                      }}>
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{
                      padding: '20px 24px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center'
                      }}>
                        <button
                          onClick={() => setState(prev => ({ ...prev, editingContact: contact }))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#D9D9D9',
                            transition: 'all 0.2s ease'
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
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.contactId)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#D9D9D9',
                            transition: 'all 0.2s ease'
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
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
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

      {/* Error Toast */}
      {state.error && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#DE1785',
          color: '#FFFBFA',
          padding: '16px 24px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(222, 23, 133, 0.3)',
          zIndex: 1001
        }}>
          {state.error}
        </div>
      )}
    </div>
  );
};

// Modal Component
interface ContactModalProps {
  mode: 'create' | 'edit';
  userId?: string;
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
    
    if (!formData.name.trim()) return;

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
      padding: '24px'
    }} onClick={onCancel}>
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
          borderBottom: '1px solid #D9D9D9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '400',
              color: '#000505',
              margin: 0
            }}>
              {mode === 'create' ? 'Add Contact' : 'Edit Contact'}
            </h2>
            <button
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#D9D9D9',
                transition: 'all 0.2s ease'
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
        
        <form onSubmit={handleSubmit} style={{ padding: '24px 32px 32px 32px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px'
            }}>
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
            />
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#000505',
              marginBottom: '8px'
            }}>
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              style={{
                width: '100%',
                padding: '16px',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: '#FFFBFA',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#D9D9D9'}
            />
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: 'transparent',
                color: '#D9D9D9',
                border: '1px solid #D9D9D9',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
              type="submit"
              disabled={!formData.name.trim()}
              style={{
                background: formData.name.trim() ? '#DE1785' : '#D9D9D9',
                color: '#FFFBFA',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: formData.name.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (formData.name.trim()) {
                  e.currentTarget.style.background = '#c21668';
                }
              }}
              onMouseLeave={(e) => {
                if (formData.name.trim()) {
                  e.currentTarget.style.background = '#DE1785';
                }
              }}
            >
              <Check size={16} />
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactsHome; 