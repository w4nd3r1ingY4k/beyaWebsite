// src/ChatInputBar.tsx
import React, { useEffect, useRef } from 'react';

const mic = require('@/webapp/assets/mic.png');
const add = require('@/webapp/assets/add.png');
const send = require('@/webapp/assets/arrow_warm_up.png');

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
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
    <div className="flex flex-col px-5 py-4 border border-gray-200 rounded-lg bg-transparent gap-3">
      {/* ── Textarea with placeholder ── */}
      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="w-full px-1.5 py-1.5 border-none outline-none resize-none text-base font-sans bg-transparent leading-tight box-border min-h-[36px]"
        />
        {/* Custom placeholder text */}
        {!message && (
          <div className="absolute inset-y-1.5 left-1.5 pointer-events-none text-gray-400 text-sm">
            How can I help you?
          </div>
        )}
      </div>

      {/* ── Button row ── */}
      <div className="flex items-center justify-between w-full">
        {/* ── Plus Icon on the left ── */}
        <button
          onClick={() => console.log('Add clicked')}
          className="bg-none border-none p-0 cursor-pointer flex-shrink-0"
        >
          <img src={add} alt="Add" className="w-[22px] h-[22px]" />
        </button>

        {/* ── Right side buttons (Mic and Send) ── */}
        <div className="flex items-center gap-4">
          {/* ── Mic Icon ── */}
          <button
            onClick={() => console.log('Mic clicked')}
            className="bg-none border-none p-0 cursor-pointer flex-shrink-0"
          >
            <img src={mic} alt="Mic" className="w-[22px] h-[22px]" />
          </button>

          {/* ── Send Icon ── */}
          <button
            onClick={onSend}
            disabled={isDisabled}
            className={`bg-none border-none p-0 flex-shrink-0 ${
              isDisabled
                ? 'cursor-default opacity-40'
                : 'cursor-pointer opacity-100'
            }`}
          >
            <img src={send} alt="Send" className="w-[22px] h-[22px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputBar;
