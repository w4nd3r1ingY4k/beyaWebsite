// src/pages/Homes.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideMenu } from '../ui/SideMenu';
import { ReactComponent as HomeIcon } from '@/webapp/assets/home-icon.svg';
import { ReactComponent as CRMIcon } from '@/webapp/assets/crm-icon.svg';
import { ReactComponent as DataIcon } from '@/webapp/assets/data-icon.svg';
import { ReactComponent as LogisticsIcon } from '@/webapp/assets/logistics-icon.svg';
import { ReactComponent as MarketingIcon } from '@/webapp/assets/marketing-icon.svg';
import { ReactComponent as CommerceIcon } from '@/webapp/assets/commerce-icon.svg';
import InboxHome from './crm/Inbox/Home';
import ContactsCRM from './crm/Contacts/Home';
import CalendarPage from './crm/Schedule/ScheduleHome';
import AIChatCircle from '../ui/AIassistant';
import HomeDashboard from './home/home';
import { useAuth } from '../../AuthContext';

const ICON_SIZE = 60;

const icons = [
  { id: 'home',      Component: HomeIcon,     label: 'Home' },
  { id: 'crm',       Component: CRMIcon,      label: 'CRM' },
  { id: 'marketing', Component: MarketingIcon, label: 'Marketing' },
  { id: 'logistics', Component: LogisticsIcon, label: 'Logistics' },
  { id: 'commerce',  Component: CommerceIcon,  label: 'Commerce' },
  { id: 'data',      Component: DataIcon,      label: 'Data' },
  { id: 'settings',  Component: DataIcon,      label: 'Settings' },
] as const;

const Homes: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
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
    return (
      <div className="p-24 text-center">
        <span className="text-lg font-medium">Loading…</span>
      </div>
    );
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
          return <ContactsCRM />;
        case 'schedule':
          return <CalendarPage />;
        default:
          return (
            <div className="mt-10">
              <h2 className="text-2xl font-semibold">CRM Dashboard</h2>
              <p className="mt-2 text-gray-700">Select something from the CRM menu</p>
            </div>
          );
      }
    }

    // non-CRM, non-home pages
    const { Component, label } = icons.find(i => i.id === activeIcon)!;
    return (
      <div className="flex items-center space-x-4">
        <Component width={ICON_SIZE} height={ICON_SIZE} />
        <span className="text-2xl font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="flex bg-[#FFFBFA] min-h-screen">
      <SideMenu
        activeIcon={activeIcon}
        activeSubmenu={activeSubmenu}
        onSelect={handleMenuSelect}
      />

      <div className="flex-1 p-0 relative">
        <AIChatCircle />
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
};

export default Homes;
