import React, { useState } from 'react';
import { useAuth } from './AuthContext';

// Mock user data based on the Lambda handler structure
const mockUserData = {
  userId: 'user_123456',
  subscriber_email: 'user@example.com',
  createdAt: '2024-01-15T10:30:00Z',
  lastLoginAt: '2024-12-20T14:45:00Z',
  companyId: 'company_789',
  timezone: 'America/New_York',
  displayName: 'John Doe',
  connectedAccounts: [
    { id: 'google', name: 'Google Workspace', status: 'connected', icon: '🔗' },
    { id: 'slack', name: 'Slack', status: 'connected', icon: '💬' },
    { id: 'github', name: 'GitHub', status: 'disconnected', icon: '🐙' },
    { id: 'notion', name: 'Notion', status: 'connected', icon: '📝' }
  ]
};

const SettingsPage = () => {
    const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('contact');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  const handleSendMessage = (e: any) => {
    e.preventDefault();
    if (message.trim() && subject.trim()) {
      // Simulate sending message
      setSendStatus('sending');
      setTimeout(() => {
        setSendStatus('sent');
        setMessage('');
        setSubject('');
        setTimeout(() => setSendStatus(''), 3000);
      }, 1000);
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      console.log('Signing out...');
      // Call logout from auth context
      if (logout) {
        logout();
      }
      // Redirect to home page
      window.location.href = '/';
    }
  };

  const formatDate = (dateString: any) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 40px',
          borderBottom: '1px solid #F0F0F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
            <button
                onClick={() => window.location.href = '/webapp'}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer',
                    marginRight: '24px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                    e.currentTarget.style.borderColor = '#DF1785';
                    e.currentTarget.style.color = '#DF1785';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.color = '#374151';
                }}
            >
                ← Back
            </button>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#1A1A1A',
              margin: 0
            }}>Settings</h1>
            <p style={{
              fontSize: '14px',
              color: '#666',
              margin: '8px 0 0 0'
            }}>Manage your account and integrations</p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#DC2626',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEF2F2';
                e.currentTarget.style.backgroundColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E0E0E0';
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #F0F0F0',
          padding: '0 40px'
        }}>
          <button
            onClick={() => setActiveTab('contact')}
            style={{
              padding: '16px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'contact' ? '2px solid #DF1785' : '2px solid transparent',
              fontSize: '15px',
              fontWeight: '500',
              color: activeTab === 'contact' ? '#DF1785' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-1px'
            }}
          >
            Contact
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            style={{
              padding: '16px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'integrations' ? '2px solid #DF1785' : '2px solid transparent',
              fontSize: '15px',
              fontWeight: '500',
              color: activeTab === 'integrations' ? '#DF1785' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-1px'
            }}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('account')}
            style={{
              padding: '16px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'account' ? '2px solid #DF1785' : '2px solid transparent',
              fontSize: '15px',
              fontWeight: '500',
              color: activeTab === 'account' ? '#DF1785' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-1px'
            }}
          >
            Account
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 40px' }}>
          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '24px'
              }}>Get in Touch</h2>
              
              <form onSubmit={handleSendMessage}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this about?"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DF1785'}
                    onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '1px solid #E0E0E0',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'vertical',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DF1785'}
                    onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!message.trim() || !subject.trim() || sendStatus === 'sending'}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: message.trim() && subject.trim() ? '#DF1785' : '#F0F0F0',
                    color: message.trim() && subject.trim() ? '#FFFFFF' : '#999',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: message.trim() && subject.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    if (message.trim() && subject.trim()) {
                      e.currentTarget.style.backgroundColor = '#C01570';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (message.trim() && subject.trim()) {
                      e.currentTarget.style.backgroundColor = '#DF1785';
                    }
                  }}
                >
                  {sendStatus === 'sending' ? 'Sending...' : sendStatus === 'sent' ? '✓ Sent' : 'Send Message'}
                </button>

                {sendStatus === 'sent' && (
                  <p style={{
                    marginTop: '16px',
                    fontSize: '14px',
                    color: '#059669'
                  }}>
                    Your message has been sent successfully!
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
        <div>
          <h2>Connected Accounts{user ? ` for ${user.userId}` : ''}</h2>
          {!user || !user.connectedAccounts || Object.entries(user.connectedAccounts).length === 0
            ? <p>No integrations connected.</p>
            : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {Object.entries(user.connectedAccounts).map(([key, value]) => (
                  <li key={key} style={{ margin: '8px 0' }}>
                    <strong>{key}</strong>: {String(value)}
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '24px'
              }}>Account Information</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Display Name</label>
                  <p style={{
                    fontSize: '15px',
                    color: '#1A1A1A',
                    margin: '6px 0 0 0'
                  }}>{mockUserData.displayName}</p>
                </div>

                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Email</label>
                  <p style={{
                    fontSize: '15px',
                    color: '#1A1A1A',
                    margin: '6px 0 0 0'
                  }}>{user?.email || 'Not available'}</p>
                </div>
                
                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Timezone</label>
                  <p style={{
                    fontSize: '15px',
                    color: '#1A1A1A',
                    margin: '6px 0 0 0'
                  }}>{mockUserData.timezone}</p>
                </div>

                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Member Since</label>
                  <p style={{
                    fontSize: '15px',
                    color: '#1A1A1A',
                    margin: '6px 0 0 0'
                  }}>{formatDate(mockUserData.createdAt)}</p>
                </div>

                <div>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Last Login</label>
                  <p style={{
                    fontSize: '15px',
                    color: '#1A1A1A',
                    margin: '6px 0 0 0'
                  }}>{formatDate(mockUserData.lastLoginAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;