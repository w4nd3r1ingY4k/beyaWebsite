import React, { useState } from 'react';
import { TrendingUp, Users, DollarSign, Calendar, RefreshCw, Database, BarChart3, PieChart, ShoppingBag, Package } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';

interface HyrosJourneyData {
  lead: {
    email: string;
    id: string;
    creationDate: string;
    firstName?: string;
    lastName?: string;
    firstSource?: {
      name: string;
      tag: string;
      platform: string;
      clickDate: string;
      category?: {
        name: string;
      };
    };
    lastSource?: {
      name: string;
      tag: string;
      platform: string;
      clickDate: string;
    };
  };
  sales: Array<{
    id: string;
    creationDate: string;
    price: {
      price: number;
      currency: string;
    };
    usdPrice: {
      price: number;
      currency: string;
    };
    product: {
      name: string;
      tag: string;
    };
  }>;
}

interface BusinessCentralData {
  companies?: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
  revenue?: {
    totalRevenue: number;
    pendingRevenue: number;
    totalSalesInvoices: number;
    totalSalesOrders: number;
    totalProducts: number;
    recentInvoices: Array<{
      id: string;
      number: string;
      customerName: string;
      amount: number;
      currency: string;
      date: string;
      status: string;
    }>;
    topProducts: Array<{
      id: string;
      number: string;
      displayName: string;
      unitPrice: number;
      inventory: number;
    }>;
  };
}

const AttributionHome: React.FC = () => {
  const [hyrosData, setHyrosData] = useState<HyrosJourneyData[]>([]);
  const [businessCentralData, setBusinessCentralData] = useState<BusinessCentralData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Business Central API integration - now fetches comprehensive revenue data
  const fetchBusinessCentralData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Get Business Central access token
      const tokenResponse = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/business-central/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: '67051142-4b70-4ae9-8992-01d17e991da9',
          clientId: '29cda312-4374-4b29-aefd-406dd53060a3',
          clientSecret: 'Uur8Q~pHGV6-x2ixqxww45dszxf2gY--5wSl~c.Q'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Business Central access token');
      }

      const tokenData = await tokenResponse.json();
      const authHeaders = {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      };

      // Step 2: Fetch revenue data and companies in parallel
      const [companiesRes, revenueRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.BACKEND_URL}/api/business-central/companies`, { headers: authHeaders }),
        fetch(`${API_ENDPOINTS.BACKEND_URL}/api/business-central/revenue`, { headers: authHeaders })
      ]);

      const [companiesData, revenueData] = await Promise.all([
        companiesRes.ok ? companiesRes.json() : { value: [] },
        revenueRes.ok ? revenueRes.json() : null
      ]);

      setBusinessCentralData({
        companies: companiesData.value || [],
        revenue: revenueData || undefined
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Business Central data');
    } finally {
      setLoading(false);
    }
  };

  // Hyros API integration - focused on customer journeys
  const fetchHyrosData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/hyros/journeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'API_68194c4d9102aaa7b403d8d58a1dcc014f4e63a2224ed0b913681e2f8e9e8f97',
          fromDate: '2025-07-01',
          toDate: '2025-07-15',
          pageSize: 50,
          pageId: 0
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Hyros journey data');
      }

      const data = await response.json();
      setHyrosData(data.result || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Hyros data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate attribution data for pie chart
  const getAttributionData = () => {
    const channelStats: { [key: string]: { revenue: number, customers: number } } = {};
    
    hyrosData.forEach(journey => {
      const platform = journey.lead.firstSource?.platform || 'Unknown';
      const category = journey.lead.firstSource?.category?.name || platform;
      const revenue = journey.sales.reduce((sum, sale) => sum + sale.usdPrice.price, 0);
      
      if (!channelStats[category]) {
        channelStats[category] = { revenue: 0, customers: 0 };
      }
      
      channelStats[category].revenue += revenue;
      channelStats[category].customers += 1;
    });

    return Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      revenue: stats.revenue,
      customers: stats.customers,
      percentage: hyrosData.length > 0 ? (stats.customers / hyrosData.length * 100).toFixed(1) : '0'
    }));
  };

  const calculateHyrosMetrics = () => {
    const totalRevenue = hyrosData.reduce((sum, journey) => {
      return sum + journey.sales.reduce((salesSum, sale) => salesSum + sale.usdPrice.price, 0);
    }, 0);

    const totalCustomers = hyrosData.length;
    const avgOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    return { totalRevenue, totalCustomers, avgOrderValue };
  };

  const calculateBusinessCentralMetrics = () => {
    const totalSalesOrders = businessCentralData.revenue?.totalSalesOrders || 0;
    const totalProducts = businessCentralData.revenue?.totalProducts || 0;
    const totalCustomers = businessCentralData.companies?.length || 0;

    return { totalSalesOrders, totalProducts, totalCustomers };
  };

  const { totalRevenue, totalCustomers, avgOrderValue } = calculateHyrosMetrics();
  const { totalSalesOrders, totalProducts, totalCustomers: bcCustomers } = calculateBusinessCentralMetrics();
  const attributionData = getAttributionData();

  return (
    <div style={{
      padding: '40px',
      height: '100%',
      backgroundColor: '#FFFBFA',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 8px 0',
          letterSpacing: '-0.025em'
        }}>
          Attribution Analytics
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Customer journey attribution from Hyros and comprehensive business data from Business Central
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <button
          onClick={fetchHyrosData}
          disabled={loading}
          style={{
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1
          }}
        >
          <BarChart3 size={16} />
          Fetch Hyros Journeys
        </button>

        <button
          onClick={fetchBusinessCentralData}
          disabled={loading}
          style={{
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: loading ? 0.6 : 1
          }}
        >
          <Database size={16} />
          Fetch Business Central Data
        </button>

        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748b'
          }}>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Loading...
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          color: '#DC2626',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Metrics Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Hyros Metrics */}
        {hyrosData.length > 0 && (
          <>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <DollarSign size={20} style={{ color: '#EF4444' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Hyros Revenue</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                ${totalRevenue.toLocaleString()}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Users size={20} style={{ color: '#EF4444' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Attributed Customers</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {totalCustomers}
              </div>
            </div>
          </>
        )}

        {/* Business Central Metrics */}
        {businessCentralData.revenue && (
          <>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <DollarSign size={20} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>BC Total Revenue</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                ${businessCentralData.revenue.totalRevenue.toLocaleString()}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp size={20} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Pending Revenue</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                ${businessCentralData.revenue.pendingRevenue.toLocaleString()}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShoppingBag size={20} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Sales Invoices</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {businessCentralData.revenue.totalSalesInvoices}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShoppingBag size={20} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Sales Orders</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {totalSalesOrders}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Package size={20} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Products</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>
                {totalProducts}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: hyrosData.length > 0 && businessCentralData.revenue ? '1fr 1fr' : '1fr',
        gap: '32px',
        flex: 1
      }}>
        {/* Hyros Section */}
        {hyrosData.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              margin: '0 0 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BarChart3 size={20} style={{ color: '#EF4444' }} />
              Customer Attribution
            </h3>

            {/* Attribution Pie Chart Data */}
            {attributionData.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
                  Channel Attribution
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attributionData.map((item, index) => (
                    <div key={item.channel} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][index % 5]
                        }} />
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                          {item.channel}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                          {item.percentage}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          ${item.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Journeys */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
                Recent Customer Journeys
              </h4>
              {hyrosData.slice(0, 3).map((journey, index) => (
                <div key={journey.lead.id} style={{
                  padding: '16px',
                  border: '1px solid #f1f5f9',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {journey.lead.firstName} {journey.lead.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {journey.lead.email}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>
                        ${journey.sales.reduce((sum, sale) => sum + sale.usdPrice.price, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {journey.lead.firstSource && (
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>{journey.lead.firstSource.platform}</strong> • {journey.lead.firstSource.category?.name || 'Unknown'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Central Revenue Data */}
        {businessCentralData.revenue && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e293b',
              margin: '0 0 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Database size={20} style={{ color: '#3B82F6' }} />
              Business Central Revenue
            </h3>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {/* Revenue Summary */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  Revenue Summary
                </h4>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                    Total Revenue: ${businessCentralData.revenue.totalRevenue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    From {businessCentralData.revenue.totalSalesInvoices} completed sales
                  </div>
                </div>
                {businessCentralData.revenue.pendingRevenue > 0 && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef3f2',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>
                      Pending: ${businessCentralData.revenue.pendingRevenue.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      From {businessCentralData.revenue.totalSalesOrders} orders
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Invoices */}
              {businessCentralData.revenue.recentInvoices && businessCentralData.revenue.recentInvoices.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                    Recent Sales Invoices
                  </h4>
                  {businessCentralData.revenue.recentInvoices.map((invoice) => (
                    <div key={invoice.id} style={{
                      padding: '12px',
                      border: '1px solid #f1f5f9',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                            {invoice.number}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {invoice.customerName}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>
                            ${invoice.amount?.toLocaleString()} {invoice.currency}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {invoice.date}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Products */}
              {businessCentralData.revenue.topProducts && businessCentralData.revenue.topProducts.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                    Products ({businessCentralData.revenue.totalProducts} total)
                  </h4>
                  {businessCentralData.revenue.topProducts.slice(0, 3).map((product) => (
                    <div key={product.id} style={{
                      padding: '12px',
                      border: '1px solid #f1f5f9',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        {product.displayName || product.number}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        ${product.unitPrice?.toLocaleString()} • Stock: {product.inventory || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AttributionHome; 