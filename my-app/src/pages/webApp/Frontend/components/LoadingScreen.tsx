import React from 'react';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading...", 
  submessage 
}) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFBFA',
      minHeight: 'calc(100vh - 45px)', // Account for header height
      position: 'relative'
    }}>
      {/* Loading Spinner */}
      <div style={{
        width: '48px',
        height: '48px',
        border: '3px solid #f3f4f6',
        borderTop: '3px solid #DE1785',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '24px'
      }} />
      
      {/* Loading Text */}
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '500',
        color: '#111827',
        textAlign: 'center'
      }}>
        {message}
      </h3>
      
      {/* Submessage */}
      {submessage && (
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          {submessage}
        </p>
      )}
      
      {/* Spinning Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen; 