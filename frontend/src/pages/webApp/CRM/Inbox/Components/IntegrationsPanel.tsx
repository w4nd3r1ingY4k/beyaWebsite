import React, { useState, useEffect } from 'react';
import { createFrontendClient } from "@pipedream/sdk/browser";
import { useAuth } from "../../../../AuthContext";

// Fargate service URL - using DNS name instead of IP for stability
const FARGATE_SERVICE_URL = 'http://beya-polling-nlb-3031d63a230444c0.elb.us-east-1.amazonaws.com:2074';

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  lastSync?: string;
}

interface IntegrationsPanelProps {
  width?: number;
}

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ width = 280 }) => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([
    // { id: 'shopify',           name: 'Shopify',            icon: '🛍️', description: 'E-commerce platform',           connected: false },
    // { id: 'business-central',  name: 'Business Central BI', icon: '📊', description: 'Microsoft business intelligence', connected: false },
    { id: 'gmail',             name: 'Gmail',              icon: '📧', description: 'Email integration',            connected: false },
    { id: 'whatsapp',          name: 'WhatsApp Business',  icon: '📱', description: 'Messaging platform',          connected: true,  lastSync: '5 minutes ago' },
    // { id: 'slack',             name: 'Slack',              icon: '💬', description: 'Team communication',          connected: false },
    // { id: 'square',            name: 'Square',             icon: '💳', description: 'Payment processing and POS',   connected: false,  lastSync: '3 minutes ago' },
    // { id: 'klaviyo',           name: 'Klaviyo',            icon: '✉️', description: 'Email marketing automation', connected: false },
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
      const userId = user?.userId;
      if (!userId) {
        alert('Please log in to connect integrations');
        return;
      }
      let result;
      // if (integrationId === 'shopify') {
      //   result = await safeFetch(`${FARGATE_SERVICE_URL}/shopify/connect`, { userId, action: 'create_token' });
      //   await createFrontendClient().connectAccount({
      //     app: 'shopify', token: result.token,
      //     onSuccess: () => updateIntegration('shopify', true, 'just now'),
      //     onError: err => alert('Shopify connect error: ' + err.message),
      //   });
      // } else if (integrationId === 'business-central') {
      //   result = await safeFetch(`${FARGATE_SERVICE_URL}/business-central/connect`, { userId, action: 'create_token' });
      //   await createFrontendClient().connectAccount({
      //     app: 'dynamics_365_business_central_api', token: result.token,
      //     onSuccess: () => updateIntegration('business-central', true, 'just now'),
      //     onError: err => alert('Business Central connect error: ' + err.message),
      //   });
      // } else if (integrationId === 'klaviyo') {
      //   result = await safeFetch(`${FARGATE_SERVICE_URL}/klaviyo/connect`, { userId, action: 'create_token' });
      //   await createFrontendClient().connectAccount({
      //     app: 'klaviyo', token: result.token,
      //     onSuccess: () => updateIntegration('klaviyo', true, 'just now'),
      //     onError: err => alert('Klaviyo connect error: ' + err.message),
      //   });
      // } else if (integrationId === 'square') {
      //   result = await safeFetch(`${FARGATE_SERVICE_URL}/square/connect`, { userId, action: 'create_token' });
      //   await createFrontendClient().connectAccount({
      //     app: 'square', token: result.token,
      //     onSuccess: () => updateIntegration('square', true, 'just now'),
      //     onError: err => alert('Square connect error: ' + err.message),
      //   });
      // } else 
      if (integrationId === 'whatsapp') {
        result = await safeFetch(`${FARGATE_SERVICE_URL}/whatsapp/connect`, { userId, action: 'create_token' });
        await createFrontendClient().connectAccount({
          app: 'whatsapp_business', token: result.token,
          onSuccess: async (account) => {
            console.log('🎉 WhatsApp Business account connected:', account);
            updateIntegration('whatsapp', true, 'just now');
            
            try {
              // Set up WhatsApp webhook subscriptions (this will also update the Users table)
              console.log('📱 Setting up WhatsApp webhook subscriptions...');
              
              const webhookResult = await safeFetch(`${FARGATE_SERVICE_URL}/whatsapp/setup-webhooks`, {
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
      } else if (integrationId === 'gmail') {
        result = await safeFetch(`${FARGATE_SERVICE_URL}/gmail/connect`, { userId, action: 'create_token' });
        await createFrontendClient().connectAccount({
          app: 'gmail', token: result.token,
          onSuccess: async (account) => {
            console.log('🎉 Gmail account connected:', account);
            updateIntegration('gmail', true, 'just now');
            
            // Update the Users table with the connected Gmail account
            try {
              console.log('📝 Updating user record with Gmail connection...');
              
              // Get the email address from the account
              const gmailAddress = (account as any)?.name || (account as any)?.external_id || 'gmail-connected';
              
              console.log('📧 Storing Gmail address in user record:', gmailAddress);
              
              // Update Users table via UpdateUserFunction Lambda
              const UPDATE_USER_LAMBDA_URL = 'https://6ggkpnpbpj5kynb2h5q7qke6te0fhwmx.lambda-url.us-east-1.on.aws/';
              
              await safeFetch(UPDATE_USER_LAMBDA_URL, {
                userId,
                connectedAccounts: {
                  gmail: gmailAddress
                }
              });
              console.log('✅ Updated Users table with Gmail connection');
              
              // Keep localStorage as backup for now (can remove later)
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
            
            // Phase 1: Create Pipedream workflow first
            try {
              console.log('🔄 Step 1: Creating Gmail Pipedream workflow...');
              const WORKFLOW_LAMBDA_URL = 'https://4it3sblmdni33lnj6no3ptsglu0yahsw.lambda-url.us-east-1.on.aws/';
              
              // Use the account ID from the connection response
              const gmailAccountId = (account as any)?.id || 'apn_GXhl8aX'; // Fallback to hardcoded if not available
              
              console.log('📧 Using Gmail account ID:', gmailAccountId);
              
              const workflowResult = await safeFetch(WORKFLOW_LAMBDA_URL, {
                action: 'create_workflow',
                userId,
                gmailAccountId
                // Don't send userEmail - let Lambda fetch it from Pipedream
              });
              console.log('✅ Gmail workflow created:', workflowResult);
              
              // Phase 2: Start polling with the created workflow's webhook URL
              console.log('🔄 Step 2: Setting up Gmail polling via Fargate service...');
              const webhookUrl = workflowResult.workflow?.webhook_url || workflowResult.workflow?.webhookUrl || 'https://eo2g5g5i8w7vtvc.m.pipedream.net'; // Check both properties
              console.log('📌 Using webhook URL:', webhookUrl);
              
              const pollingResult = await safeFetch(`${FARGATE_SERVICE_URL}/api/integrations/setup-polling`, { 
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
          onError: err => alert('Gmail connect error: ' + err.message),
        });
      } else {
        console.log('Integration handler not implemented');
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      alert(error.message || 'Connection failed');
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
          await safeFetch(`${FARGATE_SERVICE_URL}/api/integrations/stop-polling`, { 
            userId, 
            serviceType: 'gmail' 
          });
          console.log('✅ Gmail polling stopped');
        }
      } catch (pollingError) {
        console.error('⚠️ Failed to stop Gmail polling:', pollingError);
        // Continue with disconnection even if polling stop fails
      }
    }
    
    // TODO: call disconnect endpoint for other integrations
    updateIntegration(integrationId, false);
  };

  return (
    <div style={{ width, height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFBFA', borderLeft: '1px solid #e5e7eb' }}>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '56px 8px 8px 8px' }}>
        {integrations.map(integration => (
          <div key={integration.id} style={{ margin: '8px 0', padding: 12, background: '#fff', border: `1px solid ${integration.connected ? '#DE1785' : '#e5e7eb'}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{integration.icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{integration.name}</h4>
                  {integration.connected && integration.lastSync && <p style={{ margin: 0, fontSize: 10, color: '#6b7280' }}>Last sync: {integration.lastSync}</p>}
                </div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: integration.connected ? '#10b981' : '#ef4444' }} />
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
  );
};

export default IntegrationsPanel;