import React, { useState } from 'react';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  sku: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  totalAmount: number;
  items: OrderItem[];
  shippingAddress: string;
  paymentMethod: string;
  trackingNumber?: string;
}

// Mock order data
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    orderNumber: '#2024-001',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.j@email.com',
    status: 'delivered',
    orderDate: '2024-01-15 10:30:00',
    totalAmount: 150.99,
    items: [
      { productName: 'Wireless Bluetooth Headphones', quantity: 1, price: 79.99, sku: 'WBH-2024-001' },
      { productName: 'USB-C Charging Cable', quantity: 2, price: 14.99, sku: 'UCC-2024-006' },
      { productName: 'Laptop Stand Adjustable', quantity: 1, price: 39.99, sku: 'LSA-2024-008' }
    ],
    shippingAddress: '123 Main St, New York, NY 10001',
    paymentMethod: 'Credit Card',
    trackingNumber: 'TRK123456789'
  },
  {
    id: 'ORD-002',
    orderNumber: '#2024-002',
    customerName: 'Michael Chen',
    customerEmail: 'mchen@email.com',
    status: 'shipped',
    orderDate: '2024-01-15 11:45:00',
    totalAmount: 89.50,
    items: [
      { productName: 'Organic Cotton T-Shirt', quantity: 3, price: 24.99, sku: 'OCT-2024-002' },
      { productName: 'USB-C Charging Cable', quantity: 1, price: 14.99, sku: 'UCC-2024-006' }
    ],
    shippingAddress: '456 Oak Ave, Los Angeles, CA 90001',
    paymentMethod: 'PayPal',
    trackingNumber: 'TRK987654321'
  },
  {
    id: 'ORD-003',
    orderNumber: '#2024-003',
    customerName: 'Emma Davis',
    customerEmail: 'emma.davis@email.com',
    status: 'processing',
    orderDate: '2024-01-14 15:20:00',
    totalAmount: 245.00,
    items: [
      { productName: 'Yoga Mat Premium', quantity: 2, price: 49.99, sku: 'YMP-2024-004' },
      { productName: 'Stainless Steel Water Bottle', quantity: 3, price: 34.99, sku: 'SWB-2024-003' },
      { productName: 'Essential Oil Diffuser', quantity: 1, price: 44.99, sku: 'EOD-2024-007' }
    ],
    shippingAddress: '789 Pine St, Chicago, IL 60601',
    paymentMethod: 'Debit Card'
  },
  {
    id: 'ORD-004',
    orderNumber: '#2024-004',
    customerName: 'James Wilson',
    customerEmail: 'jwilson@email.com',
    status: 'cancelled',
    orderDate: '2024-01-14 09:15:00',
    totalAmount: 75.00,
    items: [
      { productName: 'Ceramic Coffee Mug Set', quantity: 2, price: 29.99, sku: 'CCM-2024-005' },
      { productName: 'USB-C Charging Cable', quantity: 1, price: 14.99, sku: 'UCC-2024-006' }
    ],
    shippingAddress: '321 Elm St, Houston, TX 77001',
    paymentMethod: 'Credit Card'
  },
  {
    id: 'ORD-005',
    orderNumber: '#2024-005',
    customerName: 'Olivia Martinez',
    customerEmail: 'olivia.m@email.com',
    status: 'pending',
    orderDate: '2024-01-13 14:30:00',
    totalAmount: 320.75,
    items: [
      { productName: 'Wireless Bluetooth Headphones', quantity: 2, price: 79.99, sku: 'WBH-2024-001' },
      { productName: 'Laptop Stand Adjustable', quantity: 2, price: 39.99, sku: 'LSA-2024-008' },
      { productName: 'Essential Oil Diffuser', quantity: 2, price: 44.99, sku: 'EOD-2024-007' }
    ],
    shippingAddress: '654 Maple Dr, Phoenix, AZ 85001',
    paymentMethod: 'Bank Transfer'
  }
];

const OrdersHome: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = mockOrders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return '#10B981';
      case 'shipped': return '#3B82F6';
      case 'processing': return '#F59E0B';
      case 'pending': return '#8B5CF6';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return '✅';
      case 'shipped': return '🚚';
      case 'processing': return '⚙️';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  const totalOrders = mockOrders.length;
  const pendingOrders = mockOrders.filter(o => o.status === 'pending').length;
  const shippedOrders = mockOrders.filter(o => o.status === 'shipped').length;
  const totalRevenue = mockOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Orders</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937' }}>{totalOrders}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>All time</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Revenue</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>${totalRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Excluding cancelled</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Pending Orders</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#8B5CF6' }}>{pendingOrders}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Awaiting processing</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Shipped Orders</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#3B82F6' }}>{shippedOrders}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>In transit</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: statusFilter === status ? 'none' : '1px solid #E5E7EB',
              backgroundColor: statusFilter === status ? '#DE1785' : '#FFFFFF',
              color: statusFilter === status ? '#FFFFFF' : '#6B7280',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Order
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Customer
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Items
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Total
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Status
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr 
                key={order.id} 
                style={{ 
                  borderBottom: '1px solid #E5E7EB', 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setSelectedOrder(order)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{order.orderNumber}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{order.id}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#1F2937' }}>{order.customerName}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{order.customerEmail}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#1F2937' }}>{order.items.length} items</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                  ${order.totalAmount.toFixed(2)}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getStatusIcon(order.status)}</span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(order.status)}20`,
                      color: getStatusColor(order.status),
                      textTransform: 'capitalize'
                    }}>
                      {order.status}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                  {new Date(order.orderDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937', marginBottom: '8px' }}>
                  Order {selectedOrder.orderNumber}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{getStatusIcon(selectedOrder.status)}</span>
                  <span style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: `${getStatusColor(selectedOrder.status)}20`,
                    color: getStatusColor(selectedOrder.status),
                    textTransform: 'capitalize'
                  }}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Customer Information</h3>
              <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Name: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>{selectedOrder.customerName}</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Email: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>{selectedOrder.customerEmail}</span>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Shipping Address: </span>
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>{selectedOrder.shippingAddress}</span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Order Items</h3>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                {selectedOrder.items.map((item, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      padding: '16px', 
                      borderBottom: index < selectedOrder.items.length - 1 ? '1px solid #E5E7EB' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{item.productName}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>SKU: {item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>
                        ${item.price} × {item.quantity}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>Subtotal</span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>${selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6B7280' }}>Shipping</span>
                <span style={{ fontSize: '14px', color: '#1F2937' }}>Free</span>
              </div>
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>Total</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>${selectedOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Additional Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Payment Method</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{selectedOrder.paymentMethod}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Order Date</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{selectedOrder.orderDate}</div>
              </div>
              {selectedOrder.trackingNumber && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Tracking Number</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#3B82F6' }}>{selectedOrder.trackingNumber}</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#DE1785',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersHome; 