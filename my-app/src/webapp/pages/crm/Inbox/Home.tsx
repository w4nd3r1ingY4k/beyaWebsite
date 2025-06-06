import React, { useState } from 'react';
import './Inbox.css';
import MessageList from './Components/MessageList';


const InboxHome: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="inbox-container">
      <main className="main">
      
          <div className="content">
            <MessageList
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
      </main>
    </div>
  );
};

export default InboxHome;
