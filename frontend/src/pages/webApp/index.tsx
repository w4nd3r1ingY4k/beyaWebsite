// src/pages/webApp/Frontend/Home.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideMenu } from './SideMenu';
import { ReactComponent as HomeIcon } from './assets/icons/HomeIcon.svg';
import { ReactComponent as CRMIcon } from './assets/icons/CRMIcon.svg';
import { ReactComponent as DataIcon } from './assets/icons/DataIcon.svg';
import { ReactComponent as LogisticsIcon } from './assets/icons/LogisticsIcon.svg';
import { ReactComponent as MarketingIcon } from './assets/icons/MarketingIcon.svg';
import { ReactComponent as CommerceIcon } from './assets/icons/CommerceIcon.svg';
import InboxHome from './CRM/inbox/Home';
import ContactsCRM from './CRM/contacts/Home';
import CalendarPage from './CRM/schedule/ScheduleHome';
import { useAuth } from "@/pages/AuthContext";
import IntegrationsPanel from './CRM/inbox/components/IntegrationsPanel';
import CommandBChat from './CRM/inbox/components/CommandBChat';
import LoadingScreen from './components/LoadingScreen';
import HomeDashboard from './home/index';

const ICON_SIZE = 60;
const GAP = 24;
const PADDING = 100;

const icons = [
  { id: 'home',      Component: HomeIcon,    label: 'Home' },
  { id: 'crm',       Component: CRMIcon,     label: 'CRM' },
  { id: 'marketing', Component: MarketingIcon,label: 'Marketing' },
  { id: 'logistics', Component: LogisticsIcon,label: 'Logistics' },
  { id: 'commerce',  Component: CommerceIcon, label: 'Commerce' },
  { id: 'data',      Component: DataIcon,     label: 'Data' },
  { id: 'settings',  Component: DataIcon,     label: 'Settings' },
] as const;

const Homes: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();

  // local UI state
  const [activeIcon,    setActiveIcon]    = useState<string>('home');
  const [activeSubmenu, setActiveSubmenu] = useState<string>();
  
  // Global chat panel state
  const [isCommandBChatOpen, setIsCommandBChatOpen] = useState(false);
  const [aiChatInitialMessage, setAiChatInitialMessage] = useState<string | null>(null);
  
  // Resizable sidebar state
  const [rightSidebarWidth, setRightSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  
const navigate = useNavigate();
  // 1) Redirect to /login if auth is done but no user
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // 2) Global keyboard shortcut for Command-B chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCommandBChatOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3) Handle resizing functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const newWidth = window.innerWidth - e.clientX;
      // Set minimum and maximum widths
      const minWidth = 200;
      const maxWidth = Math.min(600, window.innerWidth * 0.6);
      
      setRightSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.addEventListener('selectstart', (e) => e.preventDefault()); // Prevent text selection
      document.addEventListener('dragstart', (e) => e.preventDefault()); // Prevent drag
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      document.body.style.pointerEvents = 'none'; // Prevent interactions with other elements
      
      // Keep the resize handle interactive
      const resizeHandles = document.querySelectorAll('[data-resize-handle]');
      resizeHandles.forEach(handle => {
        (handle as HTMLElement).style.pointerEvents = 'auto';
      });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectstart', (e) => e.preventDefault());
      document.removeEventListener('dragstart', (e) => e.preventDefault());
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [isResizing]);

  // 2) Show loading spinner until auth resolves
  if (authLoading) {
    return <LoadingScreen message="Authenticating..." submessage="Verifying your credentials and setting up your workspace" />;
  }

  // 3) Now user is guaranteed to exist
  const handleMenuSelect = (iconId: string, submenuId?: string) => {
    if (iconId === 'settings') {
      navigate('/settings', { replace: true });
      return;
    }
    setActiveIcon(iconId);
    setActiveSubmenu(submenuId);
  };

  // Helper function to open AI chat with optional initial message
  const handleOpenAIChat = (message?: string) => {
    if (message) {
      setAiChatInitialMessage(message);
    }
    setIsCommandBChatOpen(true);
  };

  const renderContent = () => {
    // Custom home content when 'home' selected
    if (activeIcon === 'home') {
      return <HomeDashboard />;
    }

    if (activeIcon === 'crm') {
      switch (activeSubmenu) {
        case 'inbox':
          return <InboxHome onOpenAIChat={handleOpenAIChat} />;
        case 'contacts':
          return <ContactsCRM />;
        case 'schedule':
          return <CalendarPage />;
        default:
          return (
            <div style={{ marginTop: 30 }}>
              <h2>CRM Dashboard</h2>
              <p>Select something from the CRM menu</p>
            </div>
          );
      }
    }

    // non-CRM, non-home pages
    const { Component, label } = icons.find(i => i.id === activeIcon)!;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Component width={ICON_SIZE} height={ICON_SIZE} />
        <span style={{ fontSize: 24 }}>{label}</span>
      </div>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      backgroundColor: '#FFFBFA', 
      height: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Left Sidebar - SideMenu */}
      <SideMenu
        activeIcon={activeIcon}
        activeSubmenu={activeSubmenu}
        onSelect={handleMenuSelect}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', minWidth: 0 }}>
        {/* Page Content */}
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* <AIChatCircle /> */}
        {renderContent()}
        </div>

        {/* Resize Handle */}
        <div
          data-resize-handle
          style={{
            width: '4px',
            backgroundColor: isResizing ? '#3b82f6' : 'transparent',
            cursor: 'ew-resize',
            flexShrink: 0,
            position: 'relative',
            transition: isResizing ? 'none' : 'background-color 0.2s',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        />

        {/* Right Sidebar - Global Chat & Integrations */}
        <div style={{ 
          width: `${rightSidebarWidth}px`, 
          borderLeft: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          flexShrink: 0,
          height: '100vh',
          overflow: 'hidden',
          margin: 0,
          padding: 0
        }}>
          {isCommandBChatOpen ? (
            <CommandBChat 
              onClose={() => {
                setIsCommandBChatOpen(false);
                setAiChatInitialMessage(null);
              }} 
              initialMessage={aiChatInitialMessage}
              width={rightSidebarWidth}
            />
          ) : (
            <IntegrationsPanel width={rightSidebarWidth} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Homes;
