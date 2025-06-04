import React, { useState } from 'react';
import './Inbox.css';
import MessageList from './Components/MessageList';

const messages = [
  {
    "id": "0",
    "threadId": "akbar_shamji@brown.edu",
    channel: 'email' as const,
    "direction": "incoming" as const,
    "senderName": "John Smith",
    "senderAvatar": "https://i.pravatar.cc/40?img=3",
    "preview": "Don’t forget our meeting tomorrow at 10am.",
    "subject": "Sent Through Beya",
    "body": "Reminder for our upcoming meeting.",
    "contentType": "text",
    "timestamp": "2025-05-21T14:32:01.328Z",
    "isClosed": false
  },
]


const InboxHome: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(messages[0].id);

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
