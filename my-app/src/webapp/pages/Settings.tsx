// src/pages/SettingsPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';

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
    { id: 'notion', name: 'Notion', status: 'connected', icon: '📝' },
  ],
};

const SettingsPage: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('contact');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
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
      logout?.();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <span className="text-lg font-medium text-gray-700">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-5 py-10 font-sans">
      <div className="max-w-[800px] mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="px-8 py-8 border-b border-gray-100 flex justify-between items-center">
          <button
            onClick={() => (window.location.href = '/webapp')}
            className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 mr-6 transition-colors duration-200 hover:bg-gray-200 hover:border-pink-600 hover:text-pink-600"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-2">
              Manage your account and integrations
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50 hover:border-red-600 hover:text-red-600"
          >
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8">
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-6 py-4 text-base font-medium cursor-pointer transition-colors duration-200 ${
              activeTab === 'contact'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Contact
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-6 py-4 text-base font-medium cursor-pointer transition-colors duration-200 ${
              activeTab === 'integrations'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-4 text-base font-medium cursor-pointer transition-colors duration-200 ${
              activeTab === 'account'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Account
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Get in Touch</h2>

              <form onSubmit={handleSendMessage}>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this about?"
                    className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg outline-none focus:border-pink-600 focus:ring-1 focus:ring-pink-500 transition-colors duration-200"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg outline-none resize-vertical focus:border-pink-600 focus:ring-1 focus:ring-pink-500 transition-colors duration-200 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!message.trim() || !subject.trim() || sendStatus === 'sending'}
                  className={`px-6 py-3 rounded-lg text-base font-medium transition-colors duration-200 min-w-[120px] ${
                    message.trim() && subject.trim()
                      ? 'bg-pink-600 text-white hover:bg-pink-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {sendStatus === 'sending'
                    ? 'Sending...'
                    : sendStatus === 'sent'
                    ? '✓ Sent'
                    : 'Send Message'}
                </button>

                {sendStatus === 'sent' && (
                  <p className="mt-4 text-sm text-green-600">
                    Your message has been sent successfully!
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Connected Accounts
              </h2>
              {mockUserData.connectedAccounts.length === 0 ? (
                <p className="text-gray-700">No integrations connected.</p>
              ) : (
                <ul className="space-y-3">
                  {mockUserData.connectedAccounts.map((acct) => (
                    <li
                      key={acct.id}
                      className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{acct.icon}</span>
                        <span className="text-base font-medium text-gray-900">
                          {acct.name}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          acct.status === 'connected'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {acct.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Account Information
              </h2>

              <div className="flex flex-col space-y-5">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Display Name
                  </label>
                  <p className="mt-1 text-base text-gray-900">{mockUserData.displayName}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Email
                  </label>
                  <p className="mt-1 text-base text-gray-900">{user?.email}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Timezone
                  </label>
                  <p className="mt-1 text-base text-gray-900">{mockUserData.timezone}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Member Since
                  </label>
                  <p className="mt-1 text-base text-gray-900">
                    {formatDate(mockUserData.createdAt)}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Last Login
                  </label>
                  <p className="mt-1 text-base text-gray-900">
                    {formatDate(mockUserData.lastLoginAt)}
                  </p>
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
