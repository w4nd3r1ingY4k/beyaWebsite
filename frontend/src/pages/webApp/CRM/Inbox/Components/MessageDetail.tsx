// MessageDetail.tsx
import React from 'react';
import { Message } from '../Types';

interface Props {
  messages: Message[];    // ← now an array
  onReply: () => void;
}

const MessageDetail: React.FC<Props> = ({ messages, onReply }) => {
  if (messages.length === 0) {
    return (
      <div className="message-detail empty-state">
        <p>Select a conversation to read it</p>
      </div>
    );
  }

  return (
    <div className="message-detail" >
      {/* render each message as its own white card */}
      <div style={{ maxHeight: 10, overflowY: 'auto', paddingRight: 8 }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              background: '#FFF',
              border: '5px solid #E0E0E0',
              borderRadius: 8,
              padding: '12px',
              marginBottom: '8px',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
              <strong>{msg.direction === 'outgoing' ? 'You' : msg.senderName}</strong>{' '}
              • {new Date(msg.timestamp).toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0' }}>{msg.body}</p>
          </div>
        ))}
      </div>

      {/* Reply button stays here */}
      <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
        <button
          onClick={onReply}
          type="button"
          style={{
            background: '#DE1785',
            color: '#fff',
            padding: '4px 12px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default MessageDetail;