// src/pages/webApp/Frontend/Home.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideMenu } from './SideMenu';
import { ReactComponent as HomeIcon } from './Assets/Icons/HomeIcon.svg';
import { ReactComponent as CRMIcon } from './Assets/Icons/CRMIcon.svg';
import { ReactComponent as DataIcon } from './Assets/Icons/DataIcon.svg';
import { ReactComponent as LogisticsIcon } from './Assets/Icons/LogisticsIcon.svg';
import { ReactComponent as MarketingIcon } from './Assets/Icons/MarketingIcon.svg';
import { ReactComponent as CommerceIcon } from './Assets/Icons/CommerceIcon.svg';
import InboxHome from './CRM/Inbox/Home';
import AIChatCircle from './ai';
import { useAuth } from '../../AuthContext';
import HomeDashboard from './Home/home';

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
const navigate = useNavigate();
  // 1) Redirect to /login if auth is done but no user
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // 2) Show loading spinner until auth resolves
  if (authLoading) {
    return <div style={{ padding: PADDING, textAlign: 'center' }}>Loading…</div>;
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

  const renderContent = () => {
    // Custom home content when 'home' selected
    if (activeIcon === 'home') {
      return <HomeDashboard />;
    }

    if (activeIcon === 'crm') {
      switch (activeSubmenu) {
        case 'inbox':
          return <InboxHome />;
        case 'contacts':
          return (
            <div style={{ marginTop: 0 }}>
              <h2>CRM – Contacts</h2>
              <div>
                Welcome, {user!.email} • <button onClick={logout}>Sign out</button>
              </div>
            </div>
          );
        default:
          return (
            <div style={{ marginTop: 40 }}>
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
    <div style={{ display: 'flex', backgroundColor: '#FFFBFA' }}>
      <SideMenu
        activeIcon={activeIcon}
        activeSubmenu={activeSubmenu}
        onSelect={handleMenuSelect}
      />

      <div style={{ flex: 1, padding: 0 }}>
        {/* <AIChatCircle /> */}
        {renderContent()}
      </div>
    </div>
  );
};

export default Homes;
