import React, { useState, useEffect } from 'react';
import { useAuth } from "../../../AuthContext";
import contactsService, { Contact } from '../../../../services/contactsService';
import calendarService, { CalendarEvent } from '../../../../services/calendarService';
import { User, Mail, Phone, FileText, Plus, Edit, Clock, Calendar } from 'lucide-react';

interface ContactLookupPanelProps {
  selectedThreadId: string | null;
  flow: any; // Flow data containing contact information
  width?: number;
}

const ContactLookupPanel: React.FC<ContactLookupPanelProps> = ({ 
  selectedThreadId, 
  flow, 
  width = 280 
}) => {
  const { user } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // Calendar state
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);

  // Extract email from flow data
  const extractEmailFromFlow = (flowData: any): string | null => {
    if (!flowData) return null;

    // Priority order for email extraction
    const emailFields = [
      flowData.contactIdentifier,
      flowData.contactEmail,
      flowData.fromEmail,
      flowData.flowId?.includes('@') ? flowData.flowId : null
    ];

    for (const email of emailFields) {
      if (email && typeof email === 'string' && email.includes('@')) {
        return email;
      }
    }

    return null;
  };

  // Search for contact when thread changes
  useEffect(() => {
    const searchContact = async () => {
      if (!selectedThreadId || !flow) {
        setContact(null);
        setSearchAttempted(false);
        setError(null);
        return;
      }

      const email = extractEmailFromFlow(flow);
      if (!email) {
        setContact(null);
        setSearchAttempted(true);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setSearchAttempted(false);

      try {
        // Search for contacts by email without userId restriction (global search)
        const result = await contactsService.findContactByEmail(email);
        
        // Handle different possible response structures
        let foundContact = null;
        if (result && typeof result === 'object') {
          // If result has a contacts array
          if (result.contacts && Array.isArray(result.contacts) && result.contacts.length > 0) {
            foundContact = result.contacts[0];
          }
          // If result has a contact property
          else if (result.contact) {
            foundContact = result.contact;
          }
          // If result is directly the contact (has contactId)
          else if (result.contactId) {
            foundContact = result;
          }
          // If result is an array and has items
          else if (Array.isArray(result) && result.length > 0) {
            foundContact = result[0];
          }
        }
        
        if (foundContact && foundContact.contactId) {
          setContact(foundContact);
        } else {
          setContact(null);
        }
        setSearchAttempted(true);
      } catch (err) {
        console.error('Contact lookup error:', err.message);
        setError(`Failed to search for contact: ${err.message}`);
        setContact(null);
        setSearchAttempted(true);
      } finally {
        setLoading(false);
      }
    };

    searchContact();
  }, [selectedThreadId, flow]);

  // Fetch upcoming calendar events for the contact
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!contact?.contactId || !user?.userId) {
        setUpcomingEvents([]);
        return;
      }

      setCalendarLoading(true);
      try {
        // Get events for the next 30 days
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        const events = await calendarService.getEventsForRange(
          contact.contactId,
          new Date(),
          endDate
        );

        // Filter to only upcoming events (not past events)
        const now = new Date();
        const upcoming = events
          .filter(event => new Date(event.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 5); // Show max 5 upcoming events

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        setUpcomingEvents([]);
      } finally {
        setCalendarLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [contact?.contactId, user?.userId]);

  // Format timestamp for display
  const formatDate = (timestamp: string | number): string => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown date';
    }
  };

  // Handle create new contact
  const handleCreateContact = async () => {
    const email = extractEmailFromFlow(flow);
    if (!email || !user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      // Extract a name from the email (use the part before @)
      const defaultName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Create the contact
      const newContact = await contactsService.createContact({
        userId: user.userId,
        name: defaultName,
        email: email
      });

      console.log('✅ Created new contact:', newContact);
      
      // Update the local state to show the newly created contact
      setContact(newContact);
      setSearchAttempted(true);
      
    } catch (err) {
      console.error('❌ Failed to create contact:', err);
      setError(`Failed to create contact: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit contact
  const handleEditContact = (contactToEdit: Contact) => {
    setEditFormData({
      name: contactToEdit.name || '',
      email: contactToEdit.email || '',
      phone: contactToEdit.phone || ''
    });
    setIsEditing(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  // Handle update contact
  const handleUpdateContact = async () => {
    if (!contact || !user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedContact = await contactsService.updateContact(
        user.userId,
        contact.contactId,
        editFormData
      );

      console.log('✅ Updated contact:', updatedContact);
      
      // Update the local state with the updated contact
      setContact(updatedContact);
      setIsEditing(false);
      
    } catch (err) {
      console.error('❌ Failed to update contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedThreadId) {
    return (
      <div style={{ 
        width, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#FFFBFA', 
        borderLeft: '1px solid #e5e7eb',
        marginTop: '60px' // Add top margin to clear the status bar
      }}>
        <div style={{ 
          padding: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          flex: 1,
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <User size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: '14px' }}>
            Select a conversation to view contact information
          </p>
        </div>
      </div>
    );
  }

  const email = extractEmailFromFlow(flow);

  return (
    <div style={{ 
      width, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#FFFBFA', 
      borderLeft: '1px solid #e5e7eb',
      marginTop: '70px' // Add top margin to clear the status bar
    }}>
     

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {loading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px',
            color: '#6b7280'
          }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid #e5e7eb', 
              borderTop: '2px solid #DE1785',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '8px'
            }} />
            Searching...
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '12px', 
            background: '#fef2f2', 
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {!loading && !error && email && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px'
            }}>
              <Mail size={16} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                {email}
              </span>
            </div>
          </div>
        )}

        {contact ? (
          isEditing ? (
            // Edit Contact Form
            <div>
              <div style={{ 
                background: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <h4 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Edit size={16} />
                  Edit Contact
                </h4>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                {error && (
                  <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    fontSize: '12px'
                  }}>
                    {error}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateContact}
                  disabled={loading || !editFormData.name.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: loading || !editFormData.name.trim() ? '#d1d5db' : '#DE1785',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading || !editFormData.name.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && editFormData.name.trim()) {
                      e.currentTarget.style.backgroundColor = '#c4176c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && editFormData.name.trim()) {
                      e.currentTarget.style.backgroundColor = '#DE1785';
                    }
                  }}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          ) : (
            // Contact found - display information
            <div>
            <div style={{ 
              background: '#f0fdf4', 
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#10b981' 
                }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#065f46' }}>
                  Contact Found
                </span>
              </div>
            </div>

            {/* Contact Details */}
            <div style={{ 
              background: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827' 
              }}>
                {contact.name}
              </h4>

              {contact.email && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  
                }}>
                  <Mail size={14} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    {contact.email}
                  </span>
                </div>
              )}

              {contact.phone && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <Phone size={14} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    {contact.phone}
                  </span>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginTop: '12px'
              }}>
                <Clock size={14} style={{ color: '#6b7280' }} />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Created {formatDate(contact.createdAt)}
                </span>
              </div>
            </div>

            {/* Upcoming Calendar Events Section */}
            <div style={{ 
              background: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <Calendar size={16} style={{ color: '#6b7280' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Upcoming Events
                </span>
                {calendarLoading && (
                  <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                    Loading...
                  </span>
                )}
              </div>
              
              {upcomingEvents.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {upcomingEvents.map((event, index) => (
                    <div key={event.eventId} style={{ 
                      padding: '8px 0',
                      borderBottom: index < upcomingEvents.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <p style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '13px', 
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        {event.title}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '11px', 
                        color: '#9ca3af'
                      }}>
                        <Clock size={10} />
                        <span>
                          {new Date(event.startTime).toLocaleDateString()} at{' '}
                          {new Date(event.startTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      {event.location && (
                        <p style={{ 
                          margin: '2px 0 0 0', 
                          fontSize: '11px', 
                          color: '#9ca3af'
                        }}>
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : !calendarLoading ? (
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  fontStyle: 'italic',
                  margin: '0'
                }}>
                  No upcoming events
                </p>
              ) : null}
            </div>

            {/* Notes Section */}
            {contact.notes && contact.notes.length > 0 && (
              <div style={{ 
                background: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <FileText size={16} style={{ color: '#6b7280' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    Notes ({contact.notes.length})
                  </span>
                </div>
                
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {contact.notes.slice(0, 3).map((note, index) => (
                    <div key={index} style={{ 
                      padding: '8px 0',
                      borderBottom: index < Math.min(contact.notes!.length, 3) - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <p style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '13px', 
                        color: '#374151',
                        lineHeight: '1.4'
                      }}>
                        {note.body}
                      </p>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                  ))}
                  
                  {contact.notes.length > 3 && (
                    <div style={{ 
                      padding: '8px 0',
                      fontSize: '12px',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      +{contact.notes.length - 3} more notes
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => handleEditContact(contact)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #DE1785',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                background: 'transparent',
                color: '#DE1785',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#DE1785';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#DE1785';
              }}
            >
              <Edit size={16} />
              Edit Contact
            </button>
          </div>
          )
        ) : searchAttempted && email ? (
          // No contact found - show option to create
          <div>
            <div style={{ 
              background: '#fef3c7', 
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#f59e0b' 
                }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                  No Contact Found
                </span>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: '#a16207',
                lineHeight: '1.4'
              }}>
                No existing contact found for this email address.
              </p>
            </div>

            {/* Create Contact Button */}
            <button
              onClick={handleCreateContact}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                background: '#DE1785',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
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
              Create Contact
            </button>
          </div>
        ) : !email && searchAttempted ? (
          // No email found in thread
          <div style={{ 
            background: '#f3f4f6', 
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <FileText size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px' }}>
              No email address found for this conversation
            </p>
          </div>
        ) : null}
      </div>

    </div>
  );
};

// Add CSS animation for loading spinner
const styles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default ContactLookupPanel; 