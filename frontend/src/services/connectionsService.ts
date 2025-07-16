import { API_ENDPOINTS } from '@/config/api';
// Service to fetch user connections from backend
export interface ConnectedAccount {
  id: string;
  name: string;
  email?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  appName?: string;
}

export interface IntegrationConnection {
  connected: boolean;
  accounts: ConnectedAccount[];
}

export interface UserConnections {
  gmail: IntegrationConnection;
  whatsapp: IntegrationConnection;
  shopify: IntegrationConnection;
  square: IntegrationConnection;
  klaviyo: IntegrationConnection;
}

export interface ConnectionsResponse {
  userId: string;
  connections: UserConnections;
  summary: {
    totalConnections: number;
    connectedIntegrations: string[];
    totalAccounts?: number;
  };
}

// Use the working Lambda Function URL
const API_BASE = API_ENDPOINTS.GET_USER;

export const connectionsService = {
  /**
   * Fetch user connections from backend
   */
  async getUserConnections(userId: string): Promise<ConnectionsResponse> {
    try {
      console.log(`Fetching connections for user: ${userId}`);
      
      const response = await fetch(`${API_BASE}/users/${userId}/connections`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Connections data received:', data);
      return data;
    } catch (error) {
      console.error('Error fetching user connections:', error);
      throw error;
    }
  },

  /**
   * Get display name for an account
   */
  getAccountDisplayName(account: ConnectedAccount): string {
    if (account.email) {
      return account.email;
    }
    return account.name || 'Connected Account';
  },

  /**
   * Get integration icon
   */
  getIntegrationIcon(integration: string): string {
    switch (integration) {
      case 'gmail': return '📧';
      case 'whatsapp': return '📱';
      case 'shopify': return '🛍️';
      case 'square': return '💳';
      case 'klaviyo': return '📊';
      default: return '🔗';
    }
  }
}; 