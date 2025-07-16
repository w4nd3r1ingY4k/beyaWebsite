import React, { useState } from 'react';

interface Payment {
  id: string;
  date: string;
  customerName: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  transactionId: string;
  orderRef: string;
}

// Mock payment data
const mockPayments: Payment[] = [
  {
    id: 'PAY-001',
    date: '2024-01-15 10:30:00',
    customerName: 'Sarah Johnson',
    amount: 150.99,
    status: 'completed',
    method: 'credit_card',
    transactionId: 'TXN-123456789',
    orderRef: 'ORD-2024-001'
  },
  {
    id: 'PAY-002',
    date: '2024-01-15 11:45:00',
    customerName: 'Michael Chen',
    amount: 89.50,
    status: 'pending',
    method: 'paypal',
    transactionId: 'TXN-123456790',
    orderRef: 'ORD-2024-002'
  },
  {
    id: 'PAY-003',
    date: '2024-01-14 15:20:00',
    customerName: 'Emma Davis',
    amount: 245.00,
    status: 'completed',
    method: 'debit_card',
    transactionId: 'TXN-123456791',
    orderRef: 'ORD-2024-003'
  },
  {
    id: 'PAY-004',
    date: '2024-01-14 09:15:00',
    customerName: 'James Wilson',
    amount: 75.00,
    status: 'refunded',
    method: 'credit_card',
    transactionId: 'TXN-123456792',
    orderRef: 'ORD-2024-004'
  },
  {
    id: 'PAY-005',
    date: '2024-01-13 14:30:00',
    customerName: 'Olivia Martinez',
    amount: 320.75,
    status: 'completed',
    method: 'bank_transfer',
    transactionId: 'TXN-123456793',
    orderRef: 'ORD-2024-005'
  },
  {
    id: 'PAY-006',
    date: '2024-01-13 16:45:00',
    customerName: 'Daniel Thompson',
    amount: 55.99,
    status: 'failed',
    method: 'credit_card',
    transactionId: 'TXN-123456794',
    orderRef: 'ORD-2024-006'
  }
];

const PaymentsHome: React.FC = () => {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all');

  const filteredPayments = mockPayments.filter(payment => 
    filter === 'all' || payment.status === filter
  );

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      case 'refunded': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'credit_card': return '💳';
      case 'debit_card': return '💳';
      case 'paypal': return '🅿️';
      case 'bank_transfer': return '🏦';
      default: return '💰';
    }
  };

  const totalRevenue = mockPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Revenue</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>${totalRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Last 7 days</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Pending Payments</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#F59E0B' }}>
            {mockPayments.filter(p => p.status === 'pending').length}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Awaiting processing</div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Failed Transactions</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>
            {mockPayments.filter(p => p.status === 'failed').length}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Require attention</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {(['all', 'completed', 'pending', 'failed', 'refunded'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filter === status ? 'none' : '1px solid #E5E7EB',
              backgroundColor: filter === status ? '#DE1785' : '#FFFFFF',
              color: filter === status ? '#FFFFFF' : '#6B7280',
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

      {/* Payments List */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Transaction
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Customer
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Amount
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                Method
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
            {filteredPayments.map(payment => (
              <tr 
                key={payment.id} 
                style={{ 
                  borderBottom: '1px solid #E5E7EB', 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setSelectedPayment(payment)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1F2937' }}>{payment.id}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{payment.transactionId}</div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#1F2937' }}>
                  {payment.customerName}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                  ${payment.amount.toFixed(2)}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>{getMethodIcon(payment.method)}</span>
                  <span style={{ fontSize: '14px', color: '#6B7280', textTransform: 'capitalize' }}>
                    {payment.method.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: `${getStatusColor(payment.status)}20`,
                    color: getStatusColor(payment.status),
                    textTransform: 'capitalize'
                  }}>
                    {payment.status}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                  {new Date(payment.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
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
          onClick={() => setSelectedPayment(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937', marginBottom: '24px' }}>
              Payment Details
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Payment ID</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedPayment.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Transaction ID</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedPayment.transactionId}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Customer</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedPayment.customerName}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Amount</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#1F2937' }}>${selectedPayment.amount.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Payment Method</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937', textTransform: 'capitalize' }}>
                  {getMethodIcon(selectedPayment.method)} {selectedPayment.method.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Status</div>
                <span style={{
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: `${getStatusColor(selectedPayment.status)}20`,
                  color: getStatusColor(selectedPayment.status),
                  textTransform: 'capitalize'
                }}>
                  {selectedPayment.status}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Order Reference</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedPayment.orderRef}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Date & Time</div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#1F2937' }}>{selectedPayment.date}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedPayment(null)}
              style={{
                marginTop: '24px',
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

export default PaymentsHome; 