// src/pages/webApp/Frontend/Home.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideMenu } from './SideMenu';
import { ReactComponent as HomeIcon } from './Assets/Icons/HomeIcon.svg';
import { ReactComponent as CommerceIcon } from './Assets/Icons/CommerceIcon.svg';
import { ReactComponent as CommunicationIcon } from './Assets/Icons/CommunicationIcon.svg';
import { ReactComponent as MarketingIcon } from './Assets/Icons/MarketingIcon.svg';
import { ReactComponent as LogisticsIcon } from './Assets/Icons/LogisticsIcon.svg';
import { ReactComponent as AutomationIcon } from './Assets/Icons/AutomationIcon.svg';
import { ReactComponent as SettingsIcon } from './Assets/Icons/SettingsIcon.svg';
import InboxHome from './Communication/Inbox/Home';
import ContactsCRM from './Communication/Contacts/Home';
import CalendarPage from './Communication/Schedule/ScheduleHome';
import TicketsHome from './Communication/Tickets/TicketsHome';
import CommunicationDashboard from './Communication/CommunicationDashboard';
import PaymentsHome from './Commerce/Payments/PaymentsHome';
import ProductsHome from './Commerce/Products/ProductsHome';
import OrdersHome from './Commerce/Orders/OrdersHome';
import WebsiteHome from './Commerce/Website/WebsiteHome';
import AttributionHome from './Commerce/AttributionHome';
import CommerceDashboard from './Commerce/CommerceDashboard';
import { useAuth } from "../AuthContext";
import IntegrationsPanel from './Communication/Inbox/Components/IntegrationsPanel';
import CommandBChat from './Communication/Inbox/Components/CommandBChat';
import LoadingScreen from './components/LoadingScreen';
import HomeDashboard from './Home/index';

const ICON_SIZE = 60;
const GAP = 24;
const PADDING = 100;

const icons = [
  { id: 'home',      Component: HomeIcon,    label: 'Home' },
  { id: 'communication', Component: CommunicationIcon, label: 'Communication' },
  { id: 'marketing', Component: MarketingIcon,label: 'Marketing' },
  { id: 'logistics', Component: LogisticsIcon,label: 'Logistics' },
  { id: 'commerce',  Component: CommerceIcon, label: 'Commerce' },
  { id: 'automation', Component: AutomationIcon, label: 'Automation' },
  { id: 'settings',  Component: SettingsIcon, label: 'Settings' },
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
  const [isRightPanelHidden, setIsRightPanelHidden] = useState(false);
  
const navigate = useNavigate();
  // 1) Redirect to /login if auth is done but no user
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // 2) Global keyboard shortcuts for panel control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        
        // Command+Shift+B: Hide panel completely
        if (e.shiftKey) {
          setIsRightPanelHidden(true);
          setRightSidebarWidth(0);
          setIsCommandBChatOpen(false);
          return;
        }
        
        // Command+B: Show panel and toggle chat
        // If panel is hidden, restore it first, then open chat
        if (isRightPanelHidden) {
          setIsRightPanelHidden(false);
          setRightSidebarWidth(280);
          setIsCommandBChatOpen(true);
        } else {
          // If panel is visible, just toggle chat
          setIsCommandBChatOpen(prev => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRightPanelHidden]);

  // 3) Handle resizing functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 200;
      const maxWidth = Math.min(600, window.innerWidth * 0.6);
      const hideThreshold = 50; // Hide panel when width is less than 50px
      
      if (newWidth < hideThreshold) {
        // Hide the panel completely
        setIsRightPanelHidden(true);
        setRightSidebarWidth(0);
      } else {
        // Show panel and constrain width
        setIsRightPanelHidden(false);
        setRightSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      }
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

    if (activeIcon === 'communication') {
      switch (activeSubmenu) {
        case 'inbox':
          return <InboxHome onOpenAIChat={handleOpenAIChat} />;
        case 'contacts':
          return <ContactsCRM />;
        case 'schedule':
          return <CalendarPage />;
        case 'tickets':
          return <TicketsHome />;
        default:
          return (
            <CommunicationDashboard 
              onOptionSelect={(optionId) => handleMenuSelect('communication', optionId)}
            />
          );
      }
    }

    if (activeIcon === 'commerce') {
      switch (activeSubmenu) {
        case 'payments':
          return <PaymentsHome />;
        case 'products':
          return <ProductsHome />;
        case 'orders':
          return <OrdersHome />;
        case 'website':
          return <WebsiteHome />;
        case 'attribution':
          return <AttributionHome />;
        default:
          return (
            <CommerceDashboard 
              onOptionSelect={(optionId) => handleMenuSelect('commerce', optionId)}
            />
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

        {/* Resize Handle - Always visible, but styled differently when panel is hidden */}
        <div
          data-resize-handle
          style={{
            width: isRightPanelHidden ? '8px' : '4px',
            backgroundColor: isResizing ? '#3b82f6' : (isRightPanelHidden ? '#e5e7eb' : 'transparent'),
            cursor: 'ew-resize',
            flexShrink: 0,
            position: 'relative',
            transition: isResizing ? 'none' : 'all 0.2s',
            borderRadius: isRightPanelHidden ? '4px 0 0 4px' : '0',
            opacity: isRightPanelHidden ? 0.7 : 1,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onDoubleClick={() => {
            if (isRightPanelHidden) {
              // Restore panel to default width
              setIsRightPanelHidden(false);
              setRightSidebarWidth(280);
            } else {
              // Hide panel
              setIsRightPanelHidden(true);
              setRightSidebarWidth(0);
            }
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = isRightPanelHidden ? '#d1d5db' : '#e5e7eb';
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.backgroundColor = isRightPanelHidden ? '#e5e7eb' : 'transparent';
              e.currentTarget.style.opacity = isRightPanelHidden ? '0.7' : '1';
            }
          }}
        />

        {/* Right Sidebar - Global Chat & Integrations */}
        {!isRightPanelHidden && (
          <div style={{ 
            width: `${rightSidebarWidth}px`, 
            borderLeft: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            flexShrink: 0,
            height: '100vh',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            transition: 'width 0.2s ease-out'
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
        )}
      </div>
    </div>
  );
};

export default Homes;
