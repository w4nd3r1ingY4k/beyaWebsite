import React from 'react';
import { Inbox, Users, Calendar, Ticket } from 'lucide-react';

interface CommunicationOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CommunicationDashboardProps {
  onOptionSelect: (optionId: string) => void;
}

const CommunicationOptions: CommunicationOption[] = [
  {
    id: 'inbox',
    title: 'Inbox',
    description: 'Manage messages and conversations',
    icon: <Inbox size={32} />,
    color: '#DE1785'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Manage your customer relationships',
    icon: <Users size={32} />,
    color: '#3B82F6'
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Calendar and appointment management',
    icon: <Calendar size={32} />,
    color: '#10B981'
  },
  {
    id: 'tickets',
    title: 'Tickets',
    description: 'Support ticket tracking and resolution',
    icon: <Ticket size={32} />,
    color: '#F59E0B'
  }
];

const CommunicationDashboard: React.FC<CommunicationDashboardProps> = ({ onOptionSelect }) => {
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
          Communication
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          margin: 0,
          lineHeight: '1.5'
        }}>
          Connect with your customers and manage communications
        </p>
      </div>

      {/* Grid of Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '1200px'
      }}>
        {CommunicationOptions.map((option) => (
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

export default CommunicationDashboard; 