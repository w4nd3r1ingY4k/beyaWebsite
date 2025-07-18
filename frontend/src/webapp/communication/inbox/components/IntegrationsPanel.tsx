import React, { useState, useEffect } from 'react';
import { createFrontendClient } from "@pipedream/sdk/browser";
import { useAuth } from "../../../AuthContext";
import { Info } from 'lucide-react';
import config from '../../../../config/api';
import { API_ENDPOINTS } from '../../../../config/api';
import QRCodeModal from './QRCodeModal';

// Import logos
import gmailLogo from '@/webapp/assets/logos/gmailLogo.png';
import whatsappLogo from '@/webapp/assets/logos/whatsapp-icon logo.png';
import hyrosLogo from '@/webapp/assets/logos/hyrosLogo.png';
import msTeamsLogo from '@/webapp/assets/logos/msTeamsLogo.png';

// Use proper API endpoints instead of undefined FARGATE_SERVICE_URL
// const FARGATE_SERVICE_URL = config.FARGATE_SERVICE_URL; // This was undefined

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  // New fields for modal content
  detailedDescription: string;
  features: string[];
  setupSteps: string[];
}

interface IntegrationsPanelProps {
  width?: number;
}

// Modal component
const IntegrationModal: React.FC<{
  integration: Integration;
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}> = ({ integration, isOpen, onClose, onConnect }) => {
  if (!isOpen) return null;

  return (
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
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        maxWidth: 500,
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#6b7280',
            padding: 4,
          }}
        >
          ×
        </button>

        {/* Logo and title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <img 
            src={integration.icon} 
            alt={integration.name} 
            style={{ width: 48, height: 48, objectFit: 'contain' }}
          />
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
            {integration.name}
          </h2>
        </div>

        {/* Detailed description */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            What it does
          </h3>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
            {integration.detailedDescription}
          </p>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            Key Features
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {integration.features.map((feature, index) => (
              <li key={index} style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Setup steps */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            How to integrate
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {integration.setupSteps.map((step, index) => (
              <li key={index} style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Connect button */}
        <button
          onClick={() => {
            onConnect();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            background: integration.connected ? '#fef2f2' : '#DE1785',
            color: integration.connected ? '#dc2626' : '#fff',
            transition: 'all 0.2s',
          }}
        >
          {integration.connected ? 'Disconnect Integration' : 'Connect Integration'}
        </button>
      </div>
    </div>
  );
};

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ width = 280 }) => {
  const { user } = useAuth();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      icon: gmailLogo,
      description: 'Email integration',
      connected: false,
      detailedDescription: 'Seamlessly integrate your Gmail account to manage all your email communications directly from Beya. Send, receive, and organize emails without switching between applications.',
      features: [
        'Two-way email synchronization',
        'Send emails directly from Beya',
        'Automatic thread management',
        'Email templates and signatures',
        'Real-time email notifications',
        'Search and filter capabilities'
      ],
      setupSteps: [
        'Click the "Connect Integration" button below',
        'Sign in to your Google account when prompted',
        'Grant Beya permission to access your Gmail',
        'Your emails will start syncing automatically',
        'Start managing emails from the Beya inbox!'
      ]
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      icon: whatsappLogo,
      description: 'Messaging platform',
      connected: true,
      lastSync: '5 minutes ago',
      detailedDescription: 'Connect your WhatsApp Business account to communicate with customers through the world\'s most popular messaging platform. Manage all your WhatsApp conversations alongside your other channels.',
      features: [
        'Send and receive WhatsApp messages',
        'Media sharing (images, documents, videos)',
        'WhatsApp Business API integration',
        'Message templates for quick responses',
        'Customer conversation history',
        'Multi-agent support'
      ],
      setupSteps: [
        'Ensure you have a WhatsApp Business account',
        'Click the "Connect Integration" button',
        'Follow the authentication flow',
        'Verify your business phone number',
        'Configure message templates if needed',
        'Start messaging your customers!'
      ]
    },
    {
      id: 'hyros',
      name: 'Hyros',
      icon: hyrosLogo,
      description: 'Ad tracking & attribution',
      connected: false,
      detailedDescription: 'Hyros provides advanced ad tracking and attribution analytics to help you understand the true ROI of your marketing campaigns. Track customer journeys across multiple touchpoints and optimize your ad spend.',
      features: [
        'Advanced multi-touch attribution',
        'Real-time ad performance tracking',
        'Customer journey mapping',
        'ROI analytics and reporting',
        'Cross-platform tracking',
        'Conversion optimization insights'
      ],
      setupSteps: [
        'Ensure you have a Hyros account',
        'Click the "Connect Integration" button',
        'Enter your Hyros API credentials',
        'Configure tracking parameters',
        'Set up conversion events',
        'Start tracking your campaigns!'
      ]
    },
    {
      id: 'msteams',
      name: 'Microsoft Teams',
      icon: msTeamsLogo,
      description: 'Team collaboration & communication',
      connected: false,
      detailedDescription: 'Integrate Microsoft Teams to streamline team communication and collaboration. Manage conversations, share files, and coordinate with your team directly from Beya while keeping all customer interactions organized.',
      features: [
        'Team chat and messaging',
        'File sharing and collaboration',
        'Video calls and meetings integration',
        'Channel-based organization',
        'Real-time notifications',
        'Integration with Office 365 suite'
      ],
      setupSteps: [
        'Ensure you have a Microsoft Teams account',
        'Click the "Connect Integration" button',
        'Sign in with your Microsoft credentials',
        'Grant Beya permission to access Teams',
        'Select which teams and channels to sync',
        'Start collaborating from Beya!'
      ]
    },
    {
      id: 'whatsapp-personal',
      name: 'WhatsApp Personal',
      icon: whatsappLogo,
      description: 'Personal messaging',
      connected: false,
      detailedDescription: 'Connect your personal WhatsApp account to manage individual conversations. Perfect for solo entrepreneurs and personal customer relationships.',
      features: [
        'Send and receive personal messages',
        'Manage individual conversations',
        'Media sharing (images, documents, videos)',
        'Personal chat history',
        'Quick replies and templates',
        'Mobile and desktop sync'
      ],
      setupSteps: [
        'Ensure you have WhatsApp installed',
        'Click the "Connect Integration" button',
        'Scan the QR code with your phone',
        'Authorize Beya to access your WhatsApp',
        'Your personal chats will sync automatically',
        'Start managing conversations from Beya!'
      ]
    }
  ]);

  // Check localStorage for persisted connections on mount
  useEffect(() => {
    if (!user?.userId) return;
    
    try {
      const userConnections = JSON.parse(localStorage.getItem('userConnections') || '{}');
      const userConnection = userConnections[user.userId];
      
      if (userConnection) {
        console.log('📋 Found persisted connections:', userConnection);
        
        // Update Gmail status if found
        if (userConnection.gmail) {
          updateIntegration('gmail', true, `Connected to ${userConnection.gmail}`);
        }
      }
    } catch (error) {
      console.error('Error loading persisted connections:', error);
    }
  }, [user?.userId]);

  const updateIntegration = (id: string, connected: boolean, lastSync?: string) => {
    setIntegrations(current =>
      current.map(i => i.id === id ? { ...i, connected, lastSync } : i)
    );
  };

  const safeFetch = async (url: string, body: object) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Unexpected response: ${text}`);
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || JSON.stringify(data));
    }
    return data;
  };

  const handleConnect = async (integrationId: string) => {
    console.log('Connecting to:', integrationId);
    try {
      // ====================================
      // STEP 0: VALIDATE USER IS LOGGED IN
      // ====================================
      const userId = user?.userId;
      if (!userId) {
        alert('Please log in to connect integrations');
        return;
      }
      
      let result;
      
      // ========================================
      // WHATSAPP BUSINESS INTEGRATION FLOW
      // ========================================
      if (integrationId === 'whatsapp') {
        // 1. Get Pipedream Connect token for WhatsApp Business
        result = await safeFetch(API_ENDPOINTS.WHATSAPP_CONNECT, { userId, action: 'create_token' });
        
        // 2. Open Pipedream Connect modal for user to authenticate
        await createFrontendClient().connectAccount({
          app: 'whatsapp_business', 
          token: result.token,
          onSuccess: async (account) => {
            console.log('🎉 WhatsApp Business account connected:', account);
            updateIntegration('whatsapp', true, 'just now');
            
            try {
              // 3. Set up WhatsApp webhook subscriptions for receiving messages
              console.log('📱 Setting up WhatsApp webhook subscriptions...');
              
              const webhookResult = await safeFetch(`${API_ENDPOINTS.BACKEND_URL}/whatsapp/setup-webhooks`, {
                userId,
                whatsappAccountId: (account as any)?.id
              });
              
              console.log('✅ WhatsApp webhook subscriptions completed:', webhookResult);
              
            } catch (setupError) {
              console.error('⚠️ Failed to setup WhatsApp integration:', setupError);
              alert('WhatsApp connected, but failed to set up message receiving. Please try reconnecting.');
            }
          },
          onError: err => alert('WhatsApp connect error: ' + err.message),
        });
        
      // =======================================
      // GMAIL INTEGRATION FLOW
      // =======================================
      } else if (integrationId === 'gmail') {
        // PHASE A: GET PIPEDREAM CONNECT TOKEN
        // Get a token to initiate Pipedream Connect flow for Gmail
        result = await safeFetch(API_ENDPOINTS.GMAIL_CONNECT, { userId, action: 'create_token' });
        
        // PHASE B: OPEN PIPEDREAM CONNECT MODAL
        // User authenticates with Google and grants Gmail permissions
        await createFrontendClient().connectAccount({
          app: 'gmail', 
          token: result.token,
          
          // PHASE C: ON SUCCESSFUL GMAIL CONNECTION
          onSuccess: async (account) => {
            console.log('🎉 Gmail account connected:', account);
            updateIntegration('gmail', true, 'just now');
            
            // PHASE C1: UPDATE USER RECORD WITH GMAIL CONNECTION
            try {
              console.log('📝 Updating user record with Gmail connection...');
              
              // Extract Gmail address from Pipedream account info
              const gmailAddress = (account as any)?.name || (account as any)?.external_id || 'gmail-connected';
              console.log('📧 Storing Gmail address in user record:', gmailAddress);
              
              // Update Users table in DynamoDB via Lambda
              const UPDATE_USER_LAMBDA_URL = API_ENDPOINTS.UPDATE_USER;
              await safeFetch(UPDATE_USER_LAMBDA_URL, {
                userId,
                connectedAccounts: {
                  gmail: gmailAddress
                }
              });
              console.log('✅ Updated Users table with Gmail connection');
              
              // Also store in localStorage as backup (for now)
              const userConnections = JSON.parse(localStorage.getItem('userConnections') || '{}');
              userConnections[userId] = {
                ...userConnections[userId],
                gmail: gmailAddress,
                connectedAt: new Date().toISOString()
              };
              localStorage.setItem('userConnections', JSON.stringify(userConnections));
              console.log('✅ Also stored Gmail connection in localStorage (backup)');
              
            } catch (updateError) {
              console.error('⚠️ Failed to update user record:', updateError);
              // Don't fail the whole process if update fails
            }
            
            // PHASE C2: SET UP GMAIL EMAIL PROCESSING PIPELINE
            try {
              // STEP 1: CREATE PIPEDREAM WORKFLOW FOR EMAIL RECEIVING
              console.log('🔄 Step 1: Creating Gmail Pipedream workflow...');
              const WORKFLOW_LAMBDA_URL = 'https://4it3sblmdni33lnj6no3ptsglu0yahsw.lambda-url.us-east-1.on.aws/';
              
              // Get the Gmail account ID from Pipedream Connect response
              const gmailAccountId = (account as any).id;
              console.log('📧 Using Gmail account ID:', gmailAccountId);
              
              // Call Gmail Workflow Manager Lambda to create/get workflow
              const workflowResult = await safeFetch(WORKFLOW_LAMBDA_URL, {
                action: 'create_workflow',
                userId,
                gmailAccountId
                // Note: Don't send userEmail - let Lambda fetch it from Pipedream
              });
              console.log('✅ Gmail workflow created:', workflowResult);
              
              // STEP 2: START GMAIL POLLING WITH WORKFLOW'S WEBHOOK URL
              console.log('🔄 Step 2: Setting up Gmail polling via Fargate service...');
              
              // Extract webhook URL from workflow response (try multiple property names)
              const webhookUrl = workflowResult.workflow?.webhook_url
              console.log('📌 Using webhook URL:', webhookUrl);
              
              // Call Fargate service to start persistent Gmail polling
              const pollingResult = await safeFetch(API_ENDPOINTS.INTEGRATIONS_SETUP, { 
                userId, 
                serviceType: 'gmail',
                webhookUrl: webhookUrl
              });
              console.log('✅ Gmail polling setup successful:', pollingResult);
              
            } catch (setupError) {
              console.error('⚠️ Failed to setup Gmail integration:', setupError);
              alert('Gmail connected, but failed to set up the email processing workflow. Please try reconnecting.');
            }
          },
          
          // PHASE D: HANDLE CONNECTION ERRORS
          onError: err => alert('Gmail connect error: ' + err.message),
        });
        
      // ====================================
      // PLACEHOLDER INTEGRATIONS (NOT IMPLEMENTED)
      // ====================================
      } else if (integrationId === 'hyros') {
        // Placeholder for Hyros ad tracking integration
        console.log('Hyros integration not yet implemented');
        alert('Hyros integration coming soon! This is currently a UI placeholder.');
        // For demo purposes, just update the UI state
        updateIntegration('hyros', true, 'Demo mode');
        
      } else if (integrationId === 'msteams') {
        // Placeholder for Microsoft Teams integration
        console.log('Microsoft Teams integration not yet implemented');
        alert('Microsoft Teams integration coming soon! This is currently a UI placeholder.');
        // For demo purposes, just update the UI state
        updateIntegration('msteams', true, 'Demo mode');
        
      } else if (integrationId === 'whatsapp-personal') {
        // OpenWA WhatsApp Personal integration
        console.log('Starting OpenWA WhatsApp Personal integration...');
        
        try {
          // Start OpenWA session directly on local service
          const startResult = await safeFetch(`http://localhost:3001/start-session`, { userId });
          
          if (startResult.success) {
            console.log('✅ OpenWA session started:', startResult.message);
            updateIntegration('whatsapp-personal', true, 'Connecting...');
            
            // Show message about checking terminal
            alert('✅ OpenWA session started!\n\n📱 Check your terminal for the QR code and scan it with your WhatsApp mobile app to connect.');
            
            // Poll for connection status
            const pollConnection = async () => {
              try {
                const statusResponse = await fetch(`http://localhost:3001/session-status/${userId}`);
                const statusData = await statusResponse.json();
                
                if (statusData.isConnected) {
                  console.log('✅ OpenWA connected successfully');
                  updateIntegration('whatsapp-personal', true, 'Connected');
                  setQrModalOpen(false);
                  return;
                } else if (statusData.sessionData?.status === 'waiting_for_scan') {
                  console.log('📱 Waiting for QR code scan...');
                  updateIntegration('whatsapp-personal', true, 'Scan QR code');
                  // Continue polling
                  setTimeout(pollConnection, 2000);
                } else {
                  console.log('📱 OpenWA status:', statusData);
                  setTimeout(pollConnection, 2000);
                }
              } catch (pollError) {
                console.error('Error polling OpenWA status:', pollError);
                setTimeout(pollConnection, 5000); // Retry after 5 seconds on error
              }
            };
            
            // Start polling after a short delay
            setTimeout(pollConnection, 1000);
            
          } else {
            throw new Error(startResult.error || 'Failed to start OpenWA session');
          }
        } catch (openwaError: any) {
          console.error('OpenWA integration error:', openwaError);
          alert(`OpenWA integration failed: ${openwaError.message}`);
          updateIntegration('whatsapp-personal', false);
        }
        
      } else {
        // Unknown integration type
        console.log('Integration handler not implemented');
      }
      
    } catch (error: any) {
      // ====================================
      // GLOBAL ERROR HANDLING
      // ====================================
      console.error('Connect error:', error);
      alert(error?.message || 'Connection failed');
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    console.log('Disconnecting from:', integrationId);
    
    if (integrationId === 'gmail') {
      // Remove from localStorage
      try {
        const userConnections = JSON.parse(localStorage.getItem('userConnections') || '{}');
        if (userConnections[user!.userId]) {
          delete userConnections[user!.userId].gmail;
          localStorage.setItem('userConnections', JSON.stringify(userConnections));
          console.log('✅ Removed Gmail from localStorage');
        }
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
      
      // Stop Gmail polling via Fargate service
      try {
        const userId = user?.userId;
        if (userId) {
          console.log('🛑 Stopping Gmail polling...');
          await safeFetch(`${API_ENDPOINTS.BACKEND_URL}/api/integrations/stop-polling`, { 
            userId, 
            serviceType: 'gmail' 
          });
          console.log('✅ Gmail polling stopped');
        }
      } catch (pollingError) {
        console.error('⚠️ Failed to stop Gmail polling:', pollingError);
        // Continue with disconnection even if polling stop fails
      }
    } else if (integrationId === 'hyros') {
      // Placeholder for Hyros disconnection
      console.log('Disconnecting Hyros (demo mode)');
    } else if (integrationId === 'msteams') {
      // Placeholder for Microsoft Teams disconnection
      console.log('Disconnecting Microsoft Teams (demo mode)');
    } else if (integrationId === 'whatsapp-personal') {
      // Disconnect OpenWA session
      try {
        console.log('Disconnecting OpenWA WhatsApp Personal session...');
        const disconnectResponse = await fetch(`http://localhost:3001/disconnect/${user?.userId}`, {
          method: 'POST'
        });
        const disconnectResult = await disconnectResponse.json();
        console.log('✅ OpenWA session disconnected:', disconnectResult);
      } catch (disconnectError: any) {
        console.error('Error disconnecting OpenWA:', disconnectError);
        // Continue with UI update even if disconnect fails
      }
    }
    
    // TODO: call disconnect endpoint for other integrations
    updateIntegration(integrationId, false);
  };

  const handleInfoClick = (integration: Integration) => {
    setSelectedIntegration(integration);
    setModalOpen(true);
  };

  return (
    <>
      <div style={{ width, height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFBFA', borderLeft: '1px solid #e5e7eb' }}>
        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '56px 8px 8px 8px' }}>
          {integrations.map(integration => (
            <div key={integration.id} style={{ margin: '8px 0', padding: 12, background: '#fff', border: `1px solid ${integration.connected ? '#DE1785' : '#e5e7eb'}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img 
                    src={integration.icon} 
                    alt={integration.name} 
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{integration.name}</h4>
                    {integration.connected && integration.lastSync && <p style={{ margin: 0, fontSize: 10, color: '#6b7280' }}>Last sync: {integration.lastSync}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Info icon */}
                  <button
                    onClick={() => handleInfoClick(integration)}
                    style={{
                      background: 'none',
                      border: '1px solid #e5e7eb',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#6b7280',
                      transition: 'all 0.2s',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#DE1785';
                      e.currentTarget.style.color = '#DE1785';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    <Info size={16} />
                  </button>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: integration.connected ? '#10b981' : '#ef4444' }} />
                </div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>{integration.description}</p>
              <button onClick={() => integration.connected ? handleDisconnect(integration.id) : handleConnect(integration.id)} style={{ width: '100%', padding: '8px 12px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: integration.connected ? '#fef2f2' : '#DE1785', color: integration.connected ? '#dc2626' : '#fff' }}>
                {integration.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#FBF7F7' }}>
          <button style={{ width: '100%', padding: '8px 12px', border: '1px solid #DE1785', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#DE1785' }}>
            + Add Integration
          </button>
        </div>
      </div>

      {/* Modal */}
      {selectedIntegration && (
        <IntegrationModal
          integration={selectedIntegration}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedIntegration(null);
          }}
          onConnect={() => {
            if (selectedIntegration.connected) {
              handleDisconnect(selectedIntegration.id);
            } else {
              handleConnect(selectedIntegration.id);
            }
          }}
        />
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        userId={user?.userId || ''}
      />
    </>
  );
};

export default IntegrationsPanel;