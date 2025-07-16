import React from 'react';
import { Message } from '../Types';

interface Props {
  message: Message;
  isActive: boolean;
  onClick: () => void;
}

const MessageBox: React.FC<Props> = ({ message, isActive, onClick }) => {
  return (
    <div
      className={`message-preview ${isActive ? 'active' : 'inactive'}`}
      onClick={onClick}
    >
      <div className="text">
        <div className="sender">{message.senderName}</div>
        <div className="subject">{message.subject}</div>
        <div className="preview">{message.preview}</div>
      </div>
    </div>
  );
};

export default MessageBox;