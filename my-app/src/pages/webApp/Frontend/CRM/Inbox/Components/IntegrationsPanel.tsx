import React, { useState } from 'react';
import { createFrontendClient } from "@pipedream/sdk/browser";

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  lastSync?: string;
}

const IntegrationsPanel: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'shopify',           name: 'Shopify',            icon: '🛍️', description: 'E-commerce platform',           connected: false },
    { id: 'business-central',  name: 'Business Central BI', icon: '📊', description: 'Microsoft business intelligence', connected: false },
    { id: 'gmail',             name: 'Gmail',              icon: '📧', description: 'Email integration',            connected: true,  lastSync: '2 minutes ago' },
    { id: 'whatsapp',          name: 'WhatsApp Business',  icon: '📱', description: 'Messaging platform',          connected: true,  lastSync: '5 minutes ago' },
    { id: 'slack',             name: 'Slack',              icon: '💬', description: 'Team communication',          connected: false },
    { id: 'square',            name: 'Square',             icon: '💳', description: 'Payment processing and POS',   connected: false,  lastSync: '3 minutes ago' },
    { id: 'klaviyo',           name: 'Klaviyo',            icon: '✉️', description: 'Email marketing automation', connected: false },
  ]);

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
      const userId = getCurrentUserId();
      let result;
      if (integrationId === 'shopify') {
        result = await safeFetch('http://localhost:2074/shopify/connect', { userId, action: 'create_token' });
        await createFrontendClient().connectAccount({
          app: 'shopify', token: result.token,
          onSuccess: () => updateIntegration('shopify', true, 'just now'),
          onError: err => alert('Shopify connect error: ' + err.message),
        });
      } else if (integrationId === 'business-central') {
        result = await safeFetch('http://localhost:2074/business-central/connect', { userId, action: 'create_token' });
        await createFrontendClient().connectAccount({
          app: 'dynamics_365_business_central_api', token: result.token,
          onSuccess: () => updateIntegration('business-central', true, 'just now'),
          onError: err => alert('Business Central connect error: ' + err.message),
        });
      } else if (integrationId === 'klaviyo') {
        result = await safeFetch('http://localhost:2074/klaviyo/connect', { userId, action: 'create_token' });
        await createFrontendClient().connectAccount({
          app: 'klaviyo', token: result.token,
          onSuccess: () => updateIntegration('klaviyo', true, 'just now'),
          onError: err => alert('Klaviyo connect error: ' + err.message),
        });
      } else if (integrationId === 'square') {
        result = await safeFetch('http://localhost:2074/square/connect', { userId, action: 'create_token' });
        await createFrontendClient().connectAccount({
          app: 'square', token: result.token,
          onSuccess: () => updateIntegration('square', true, 'just now'),
          onError: err => alert('Square connect error: ' + err.message),
        });
      }else {
        console.log('Integration handler not implemented');
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      alert(error.message || 'Connection failed');
    }
  };

  const handleDisconnect = (integrationId: string) => {
    console.log('Disconnecting from:', integrationId);
    // TODO: call disconnect endpoint
    updateIntegration(integrationId, false);
  };

  const getCurrentUserId = () => 'user_' + Math.random().toString(36).substr(2, 9);

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div style={{ width: 280, display: 'flex', flexDirection: 'column', background: '#FFFBFA', borderLeft: '1px solid #e5e7eb' }}>
      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', background: '#FBF7F7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>🔗</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Integrations</h3>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{connectedCount} of {integrations.length} connected</p>
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
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