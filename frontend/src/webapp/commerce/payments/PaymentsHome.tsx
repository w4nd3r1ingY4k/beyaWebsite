import React, { useState } from 'react';
import { Search, DollarSign, CreditCard, TrendingUp, Filter } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = mockPayments.filter(payment => 
    (filter === 'all' || payment.status === filter) &&
    (payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
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
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#FFFBFA',
      paddingLeft: '120px',
      paddingRight: '40px',
      paddingTop: '100px',
      paddingBottom: '40px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Search and Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        gap: '24px'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          maxWidth: '400px',
          flex: '1'
        }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#D9D9D9'
            }}
          />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: '56px',
              paddingLeft: '50px',
              paddingRight: '20px',
              border: '1px solid #D9D9D9',
              borderRadius: '12px',
              fontSize: '16px',
              backgroundColor: '#FEFCFC',
              outline: 'none',
              fontFamily: 'inherit',
              color: '#000505'
            }}
          />
        </div>

        {/* Filter Dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #D9D9D9',
              backgroundColor: '#FEFCFC',
              color: '#000505',
              fontSize: '16px',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px', 
        marginBottom: '32px' 
      }}>
        <div style={{
          backgroundColor: '#FBF7F7',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #D9D9D9',
          transition: 'box-shadow 0.2s',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={20} color="#FFFFFF" />
            </div>
            <div style={{ fontSize: '16px', color: '#6B7280', fontWeight: '500' }}>
              Total Revenue
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#000505' }}>
            ${totalRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Last 7 days
          </div>
        </div>

        <div style={{
          backgroundColor: '#FBF7F7',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #D9D9D9',
          transition: 'box-shadow 0.2s',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CreditCard size={20} color="#FFFFFF" />
            </div>
            <div style={{ fontSize: '16px', color: '#6B7280', fontWeight: '500' }}>
              Pending Payments
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#000505' }}>
            {mockPayments.filter(p => p.status === 'pending').length}
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Awaiting processing
          </div>
        </div>

        <div style={{
          backgroundColor: '#FBF7F7',
          padding: '32px',
          borderRadius: '12px',
          border: '1px solid #D9D9D9',
          transition: 'box-shadow 0.2s',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} color="#FFFFFF" />
            </div>
            <div style={{ fontSize: '16px', color: '#6B7280', fontWeight: '500' }}>
              Failed Transactions
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#000505' }}>
            {mockPayments.filter(p => p.status === 'failed').length}
          </div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
            Require attention
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div style={{
        backgroundColor: '#FBF7F7',
        borderRadius: '12px',
        border: '1px solid #D9D9D9',
        overflow: 'hidden'
      }}>
        {filteredPayments.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#FFB8DF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <DollarSign size={32} color="#DE1785" />
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '400',
              color: '#000505',
              margin: '0 0 8px 0'
            }}>
              {searchTerm || filter !== 'all' ? 'No payments found' : 'No payments yet'}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              margin: '0',
              lineHeight: '1.5'
            }}>
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Payment transactions will appear here once they start coming in'
              }
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #D9D9D9' }}>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#6B7280',
                    backgroundColor: '#FBF7F7'
                  }}>
                    Transaction
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#6B7280',
                    backgroundColor: '#FBF7F7'
                  }}>
                    Customer
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#6B7280',
                    backgroundColor: '#FBF7F7'
                  }}>
                    Amount
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#6B7280',
                    backgroundColor: '#FBF7F7'
                  }}>
                    Method
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#6B7280',
                    backgroundColor: '#FBF7F7'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#6B7280',
                    backgroundColor: '#FBF7F7'
                  }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => (
                  <tr 
                    key={payment.id} 
                    style={{ 
                      borderBottom: index < filteredPayments.length - 1 ? '1px solid #D9D9D9' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: '#FEFCFC'
                    }}
                    onClick={() => setSelectedPayment(payment)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF7FB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FEFCFC'}
                  >
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#000505', marginBottom: '4px' }}>
                        {payment.id}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6B7280' }}>
                        {payment.transactionId}
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '16px', color: '#000505' }}>
                      {payment.customerName}
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '16px', fontWeight: '600', color: '#000505' }}>
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{getMethodIcon(payment.method)}</span>
                        <span style={{ fontSize: '16px', color: '#000505', textTransform: 'capitalize' }}>
                          {payment.method.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: `${getStatusColor(payment.status)}20`,
                        color: getStatusColor(payment.status),
                        textTransform: 'capitalize'
                      }}>
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', fontSize: '16px', color: '#6B7280' }}>
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              backgroundColor: '#FEFCFC',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid #D9D9D9'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#000505', 
              marginBottom: '24px',
              margin: '0 0 24px 0'
            }}>
              Payment Details
            </h2>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Payment ID
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#000505' }}>
                  {selectedPayment.id}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Transaction ID
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#000505' }}>
                  {selectedPayment.transactionId}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Customer
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#000505' }}>
                  {selectedPayment.customerName}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Amount
                </div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#000505' }}>
                  ${selectedPayment.amount.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Payment Method
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '500', 
                  color: '#000505', 
                  textTransform: 'capitalize',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {getMethodIcon(selectedPayment.method)} {selectedPayment.method.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Status
                </div>
                <span style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
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
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Order Reference
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#000505' }}>
                  {selectedPayment.orderRef}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>
                  Date & Time
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#000505' }}>
                  {selectedPayment.date}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedPayment(null)}
              style={{
                marginTop: '32px',
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#DE1785',
                color: '#FFFFFF',
                borderRadius: '12px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c21668'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DE1785'}
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