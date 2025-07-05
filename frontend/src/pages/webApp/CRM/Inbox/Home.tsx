import React from 'react';
import './Inbox.css';
import InboxContainer from './components/InboxContainer';

interface InboxHomeProps {
  onOpenAIChat?: (message?: string) => void;
}

const InboxHome: React.FC<InboxHomeProps> = ({ onOpenAIChat }) => {
  return (
    <div className="inbox-container">
      <main className="main">
        <div className="content">
          <InboxContainer onOpenAIChat={onOpenAIChat} />
        </div>
      </main>
    </div>
  );
};

export default InboxHome;
