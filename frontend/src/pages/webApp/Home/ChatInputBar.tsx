// src/ChatInputBar.tsx
import React, { useEffect, useRef } from 'react';

// Replace these with your actual imports (or require paths) for the SVG/PNG icons:
const mic = require('../Assets/Icons/mic.png');
const add = require('../Assets/Icons/add.png');
const send = require('../Assets/Icons/arrow_warm_up.png');

interface ChatInputBarProps {
  message: string;
  setMessage: (msg: string) => void;
  onSend: () => void;
  isDisabled: boolean;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  message,
  setMessage,
  onSend,
  isDisabled,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize up to a max height (120px)
  const adjustTextareaHeight = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Pressing Enter (without Shift) triggers send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) onSend();
    }
  };

  return (
    <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 20px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 12,
  }}
>
  {/* ── Textarea with placeholder ── */}
  <div style={{ position: 'relative', width: '100%' }}>
    <textarea
      ref={textareaRef}
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyDown={handleKeyDown}
      style={{
        width: '100%',
        padding: '6px 0',
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontSize: '1rem',
        fontFamily: 'inherit',
        backgroundColor: 'transparent',
        lineHeight: 1.4,
        boxSizing: 'border-box',
        minHeight: 36,
      }}
      rows={1}
    />
    {/* Custom placeholder text */}
    {!message && (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#9CA3AF',
          fontSize: '0.95rem',
        }}
      >
        How can I help you?
      </div>
    )}
  </div>

  {/* ── Button row ── */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    }}
  >
    {/* ── Plus Icon on the left ── */}
    <button
      onClick={() => console.log('Add clicked')}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <img
        src={add}
        alt="Add"
        style={{ width: 22, height: 22 }}
      />
    </button>

    {/* ── Right side buttons (Mic and Send) ── */}
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* ── Mic Icon ── */}
      <button
        onClick={() => console.log('Mic clicked')}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <img
          src={mic}
          alt="Mic"
          style={{ width: 22, height: 22 }}
        />
      </button>

      {/* ── Send Icon ── */}
      <button
        onClick={onSend}
        disabled={isDisabled}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: isDisabled ? 'default' : 'pointer',
          opacity: isDisabled ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        <img
          src={send}
          alt="Send"
          style={{
            width: 22,
            height: 22,
          }}
        />
      </button>
    </div>
  </div>
</div>
  );
};

export default ChatInputBar;