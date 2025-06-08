import React from 'react';
import './Inbox.css';
import InboxContainer from './Components/InboxContainer';

const InboxHome: React.FC = () => {
  return (
    <div className="inbox-container">
      <main className="main">
        <div className="content">
          <InboxContainer />
        </div>
      </main>
    </div>
  );
};

export default InboxHome;
