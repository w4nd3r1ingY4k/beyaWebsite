import React, { useState, useEffect } from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, userId }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📱 QR Modal useEffect triggered - isOpen:', isOpen, 'userId:', userId);
    if (!isOpen || !userId) return;

    let pollInterval: NodeJS.Timeout;

    const fetchQRCode = async () => {
      try {
        console.log('🔍 Fetching QR code for userId:', userId);
        const response = await fetch(`http://localhost:3001/qr-code/${userId}`);
        console.log('📡 QR code response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ QR code data received:', data);
          setQrCode(data.qrCode);
          setStatus(data.status);
          setError(null);
        } else if (response.status === 404) {
          // QR code not ready yet, keep polling
          console.log('⏳ QR code not ready yet, continuing to poll...');
          setStatus('generating');
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err: any) {
        console.error('❌ Error fetching QR code:', err);
        setError(err.message || 'Failed to fetch QR code');
      }
    };

    // Initial fetch
    fetchQRCode();

    // Poll for QR code every 2 seconds until we get it
    pollInterval = setInterval(fetchQRCode, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        maxWidth: 400,
        width: '90%',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#6b7280',
            padding: 4,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: 24, 
            fontWeight: 700, 
            color: '#111827',
            marginBottom: 8
          }}>
            Connect WhatsApp
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: 14, 
            color: '#6b7280',
            lineHeight: 1.6
          }}>
            Scan the QR code below with your WhatsApp mobile app to connect
          </p>
        </div>

        {/* QR Code Display */}
        <div style={{ 
          marginBottom: 24,
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          {error ? (
            <div style={{ color: '#dc2626', fontSize: 14 }}>
              <p>❌ Error: {error}</p>
              <p>Make sure the OpenWA service is running on port 3001</p>
            </div>
          ) : qrCode ? (
            <div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                alt="WhatsApp QR Code"
                style={{ 
                  width: 200, 
                  height: 200,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8
                }}
              />
              <p style={{ 
                margin: '16px 0 0 0', 
                fontSize: 12, 
                color: '#6b7280' 
              }}>
                Status: {status}
              </p>
            </div>
          ) : (
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                border: '3px solid #f3f4f6',
                borderTop: '3px solid #DE1785',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p>Generating QR code...</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                Status: {status}
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{ 
          background: '#f9fafb',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24
        }}>
          <h3 style={{ 
            fontSize: 14, 
            fontWeight: 600, 
            color: '#111827', 
            marginBottom: 8 
          }}>
            How to scan:
          </h3>
          <ol style={{ 
            margin: 0, 
            paddingLeft: 16,
            fontSize: 12,
            color: '#6b7280',
            textAlign: 'left'
          }}>
            <li style={{ marginBottom: 4 }}>Open WhatsApp on your phone</li>
            <li style={{ marginBottom: 4 }}>Tap Menu (⋮) → Linked devices</li>
            <li style={{ marginBottom: 4 }}>Tap "Link a device"</li>
            <li>Point your phone at this QR code</li>
          </ol>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 24px',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            background: '#f3f4f6',
            color: '#374151',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
        >
          Cancel
        </button>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QRCodeModal; 