import React from 'react';
import { CreditCard, Package, ShoppingCart, Globe, BarChart3 } from 'lucide-react';

interface CommerceOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CommerceDashboardProps {
  onOptionSelect: (optionId: string) => void;
}

const CommerceOptions: CommerceOption[] = [
  {
    id: 'payments',
    title: 'Payments',
    description: 'Manage transactions and payment methods',
    icon: <CreditCard size={32} />,
    color: '#3B82F6'
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Catalog and inventory management',
    icon: <Package size={32} />,
    color: '#10B981'
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'Track and manage customer orders',
    icon: <ShoppingCart size={32} />,
    color: '#F59E0B'
  },
  {
    id: 'website',
    title: 'Website',
    description: 'Build and customize your online store',
    icon: <Globe size={32} />,
    color: '#8B5CF6'
  },
  {
    id: 'attribution',
    title: 'Attribution',
    description: 'Customer journeys, revenue attribution & business analytics',
    icon: <BarChart3 size={32} />,
    color: '#EF4444'
  }
];

const CommerceDashboard: React.FC<CommerceDashboardProps> = ({ onOptionSelect }) => {
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
          Commerce
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Manage your e-commerce operations and online presence
        </p>
      </div>

      {/* Grid of Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '1200px'
      }}>
        {CommerceOptions.map((option) => (
          <div
            key={option.id}
            onClick={() => onOptionSelect(option.id)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              minHeight: '200px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.borderColor = option.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderColor = '#f1f5f9';
            }}
          >
            {/* Icon Container */}
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: `${option.color}15`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: option.color
            }}>
              {option.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1e293b',
                margin: '0 0 8px 0',
                letterSpacing: '-0.025em'
              }}>
                {option.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {option.description}
              </p>
            </div>

            {/* Arrow Icon */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: '#cbd5e1',
              transition: 'all 0.2s ease'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommerceDashboard; 