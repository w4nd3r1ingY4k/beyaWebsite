import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PageView {
  page: string;
  views: number;
  avgTime: string;
  bounceRate: number;
}

interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  color: string;
}

// Mock analytics data
const mockAnalyticsData = [
  { day: 'Mon', visitors: 1200, pageViews: 3400, sales: 8 },
  { day: 'Tue', visitors: 1350, pageViews: 3800, sales: 12 },
  { day: 'Wed', visitors: 1100, pageViews: 3200, sales: 6 },
  { day: 'Thu', visitors: 1500, pageViews: 4200, sales: 15 },
  { day: 'Fri', visitors: 1800, pageViews: 5100, sales: 20 },
  { day: 'Sat', visitors: 2200, pageViews: 6500, sales: 25 },
  { day: 'Sun', visitors: 1900, pageViews: 5800, sales: 18 }
];

const mockPageViews: PageView[] = [
  { page: '/home', views: 5842, avgTime: '2:34', bounceRate: 32.5 },
  { page: '/products', views: 3421, avgTime: '3:45', bounceRate: 28.3 },
  { page: '/checkout', views: 1256, avgTime: '5:12', bounceRate: 15.2 },
  { page: '/about', views: 987, avgTime: '1:56', bounceRate: 45.8 },
  { page: '/contact', views: 654, avgTime: '2:10', bounceRate: 38.9 }
];

const mockTrafficSources: TrafficSource[] = [
  { source: 'Direct', visitors: 4521, percentage: 35, color: '#DE1785' },
  { source: 'Organic Search', visitors: 3256, percentage: 25, color: '#3B82F6' },
  { source: 'Social Media', visitors: 2584, percentage: 20, color: '#10B981' },
  { source: 'Referral', visitors: 1938, percentage: 15, color: '#F59E0B' },
  { source: 'Email', visitors: 645, percentage: 5, color: '#8B5CF6' }
];

const WebsiteHome: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'visitors' | 'pageViews' | 'sales'>('visitors');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [activeTab, setActiveTab] = useState<'analysis' | 'builder'>('analysis');
  const [builderQuery, setBuilderQuery] = useState('');

  const totalVisitors = mockAnalyticsData.reduce((sum, day) => sum + day.visitors, 0);
  const totalPageViews = mockAnalyticsData.reduce((sum, day) => sum + day.pageViews, 0);
  const totalSales = mockAnalyticsData.reduce((sum, day) => sum + day.sales, 0);
  const avgSessionDuration = '3:24';
  const conversionRate = ((totalSales / totalVisitors) * 100).toFixed(2);

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'visitors':
        return { dataKey: 'visitors', color: '#DE1785', label: 'Visitors' };
      case 'pageViews':
        return { dataKey: 'pageViews', color: '#3B82F6', label: 'Page Views' };
      case 'sales':
        return { dataKey: 'sales', color: '#10B981', label: 'Sales' };
      default:
        return { dataKey: 'visitors', color: '#DE1785', label: 'Visitors' };
    }
  };

  const metricData = getMetricData();

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid #E5E7EB', marginTop: '0px' }}>
        <button
          onClick={() => setActiveTab('analysis')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'analysis' ? '2px solid #DE1785' : '2px solid transparent',
            color: activeTab === 'analysis' ? '#DE1785' : '#6B7280',
            fontSize: '16px',
            fontWeight: activeTab === 'analysis' ? '600' : '500',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.2s'
          }}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'builder' ? '2px solid #DE1785' : '2px solid transparent',
            color: activeTab === 'builder' ? '#DE1785' : '#6B7280',
            fontSize: '16px',
            fontWeight: activeTab === 'builder' ? '600' : '500',
            cursor: 'pointer',
            marginBottom: '-1px',
            transition: 'all 0.2s'
          }}
        >
          Builder
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' ? (
        <div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Visitors</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937' }}>{totalVisitors.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>↑ 12.5% from last week</div>
            </div>
            <div style={{ fontSize: '24px' }}>👥</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Page Views</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937' }}>{totalPageViews.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>↑ 8.3% from last week</div>
            </div>
            <div style={{ fontSize: '24px' }}>📄</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Avg. Session</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937' }}>{avgSessionDuration}</div>
              <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>↓ 2.1% from last week</div>
            </div>
            <div style={{ fontSize: '24px' }}>⏱️</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Conversion Rate</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>{conversionRate}%</div>
              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>↑ 5.7% from last week</div>
            </div>
            <div style={{ fontSize: '24px' }}>💰</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>Traffic Overview</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['7d', '30d', '90d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: timeRange === range ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: timeRange === range ? '#DE1785' : '#FFFFFF',
                    color: timeRange === range ? '#FFFFFF' : '#6B7280',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {range === '7d' ? 'Week' : range === '30d' ? 'Month' : '3 Months'}
                </button>
              ))}
            </div>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as typeof selectedMetric)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="visitors">Visitors</option>
              <option value="pageViews">Page Views</option>
              <option value="sales">Sales</option>
            </select>
          </div>
        </div>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockAnalyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #E5E7EB', 
                  borderRadius: '8px',
                  padding: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={metricData.dataKey} 
                stroke={metricData.color} 
                strokeWidth={3}
                dot={{ fill: metricData.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Pages */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '20px' }}>Top Pages</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockPageViews.map((page, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{page.page}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    Avg. time: {page.avgTime} | Bounce rate: {page.bounceRate}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>{page.views.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>views</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1F2937', marginBottom: '20px' }}>Traffic Sources</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockTrafficSources.map((source, index) => (
              <div key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{source.source}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                    {source.visitors.toLocaleString()} ({source.percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${source.percentage}%`, 
                      height: '100%', 
                      backgroundColor: source.color,
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      </div>
      ) : (
        // Builder Tab Content
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)' }}>
          {/* Website Preview */}
          <div style={{ 
            flex: 1, 
            backgroundColor: '#FFFFFF', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <div style={{ 
              padding: '16px', 
              borderBottom: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
              </div>
              <div style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>🔒</span>
                                 <span>https://www.google.com</span>
              </div>
              <button style={{
                padding: '8px 16px',
                backgroundColor: '#DE1785',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Refresh
              </button>
            </div>
                         <iframe 
               src="https://www.google.com" 
               style={{ 
                 width: '100%', 
                 height: 'calc(100% - 65px)', 
                 border: 'none' 
               }}
               title="Website Preview"
               sandbox="allow-same-origin allow-scripts"
             />
          </div>

          {/* Natural Language Edit Bar */}
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'sticky',
            bottom: '20px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                AI Website Builder
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                Describe the changes you'd like to make to your website
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="What would you like to change? (e.g., 'Make the header purple', 'Add a contact form', 'Change the hero text')"
                value={builderQuery}
                onChange={(e) => setBuilderQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && builderQuery.trim()) {
                    console.log('Executing builder query:', builderQuery);
                    setBuilderQuery('');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#DE1785'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
              />
              <button
                onClick={() => {
                  if (builderQuery.trim()) {
                    console.log('Executing builder query:', builderQuery);
                    setBuilderQuery('');
                  }
                }}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#DE1785',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C0136E'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DE1785'}
              >
                <span style={{ fontSize: '20px' }}>✨</span>
                Apply Changes
              </button>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
              Examples: "Make the navigation sticky" • "Add a testimonials section" • "Change the font to modern sans-serif"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteHome; 