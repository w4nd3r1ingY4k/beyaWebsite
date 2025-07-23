import React, { useState } from 'react';
import { useAuth } from '@/webapp/AuthContext';

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
      width: '100%',
      backgroundColor: '#FFFBFA',
      paddingLeft: '120px', // Account for side menu (80px menu + 40px padding)
      paddingRight: '40px', // Right padding
      paddingTop: '100px', // Top padding (60px for status bar + 40px extra)
      paddingBottom: '40px', // Bottom padding
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
        {/* Header */}
        <div style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#000505',
              margin: 0
            }}>Settings</h1>
            <p style={{
              fontSize: '16px',
              color: '#D9D9D9',
              margin: '8px 0 0 0'
            }}>Manage your account and integrations</p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              padding: '12px 24px',
              backgroundColor: '#FFFBFA',
              border: '1px solid #DE1785',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#DE1785',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DE1785';
                e.currentTarget.style.color = '#FFFBFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFBFA';
              e.currentTarget.style.color = '#DE1785';
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #D9D9D9',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => setActiveTab('contact')}
            style={{
              padding: '16px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'contact' ? '2px solid #DE1785' : '2px solid transparent',
              fontSize: '16px',
              fontWeight: activeTab === 'contact' ? '600' : '500',
              color: activeTab === 'contact' ? '#DE1785' : '#D9D9D9',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
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
              borderBottom: activeTab === 'integrations' ? '2px solid #DE1785' : '2px solid transparent',
              fontSize: '16px',
              fontWeight: activeTab === 'integrations' ? '600' : '500',
              color: activeTab === 'integrations' ? '#DE1785' : '#D9D9D9',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
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
              borderBottom: activeTab === 'account' ? '2px solid #DE1785' : '2px solid transparent',
              fontSize: '16px',
              fontWeight: activeTab === 'account' ? '600' : '500',
              color: activeTab === 'account' ? '#DE1785' : '#D9D9D9',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '-1px'
            }}
          >
            Account
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '400',
                color: '#000505',
                marginBottom: '24px'
              }}>Get in Touch</h2>
              
              <form onSubmit={handleSendMessage}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#000505',
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
                      padding: '16px',
                      fontSize: '16px',
                      border: '1px solid #D9D9D9',
                      borderRadius: '12px',
                      backgroundColor: '#FFFBFA',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.target.style.borderColor = '#D9D9D9'}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#000505',
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
                      padding: '16px',
                      fontSize: '16px',
                      border: '1px solid #D9D9D9',
                      borderRadius: '12px',
                      backgroundColor: '#FFFBFA',
                      outline: 'none',
                      resize: 'vertical',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#DE1785'}
                    onBlur={(e) => e.target.style.borderColor = '#D9D9D9'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!message.trim() || !subject.trim() || sendStatus === 'sending'}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: message.trim() && subject.trim() ? '#DE1785' : '#D9D9D9',
                    color: '#FFFBFA',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: message.trim() && subject.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    minWidth: '120px',
                    boxShadow: message.trim() && subject.trim() ? '0 2px 8px rgba(222, 23, 133, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (message.trim() && subject.trim()) {
                      e.currentTarget.style.backgroundColor = '#c21668';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (message.trim() && subject.trim()) {
                      e.currentTarget.style.backgroundColor = '#DE1785';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {sendStatus === 'sending' ? 'Sending...' : sendStatus === 'sent' ? '✓ Sent' : 'Send Message'}
                </button>

                {sendStatus === 'sent' && (
                  <p style={{
                    marginTop: '16px',
                    fontSize: '14px',
                    color: '#DE1785'
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
                fontSize: '24px',
                fontWeight: '400',
                color: '#000505',
                marginBottom: '24px'
              }}>Account Information</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#D9D9D9',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Display Name</label>
                  <p style={{
                    fontSize: '16px',
                    color: '#000505',
                    margin: '6px 0 0 0'
                  }}>{mockUserData.displayName}</p>
                </div>

                <div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#D9D9D9',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Email</label>
                  <p style={{
                    fontSize: '16px',
                    color: '#000505',
                    margin: '6px 0 0 0'
                  }}>{user?.email || 'Not available'}</p>
                </div>
                
                <div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#D9D9D9',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Timezone</label>
                  <p style={{
                    fontSize: '16px',
                    color: '#000505',
                    margin: '6px 0 0 0'
                  }}>{mockUserData.timezone}</p>
                </div>

                <div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#D9D9D9',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Member Since</label>
                  <p style={{
                    fontSize: '16px',
                    color: '#000505',
                    margin: '6px 0 0 0'
                  }}>{formatDate(mockUserData.createdAt)}</p>
                </div>

                <div>
                  <label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#D9D9D9',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Last Login</label>
                  <p style={{
                    fontSize: '16px',
                    color: '#000505',
                    margin: '6px 0 0 0'
                  }}>{formatDate(mockUserData.lastLoginAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default SettingsPage;