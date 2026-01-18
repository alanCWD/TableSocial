import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { EventManager } from './EventManager';
import { ChefManager } from './ChefManager';
import { HostManager } from './HostManager';
import { VenueManager } from './VenueManager';
import { AIQueue } from './AIQueue';

type AdminTab = 'events' | 'chefs' | 'hosts' | 'venues' | 'ai-queue';

interface AdminDashboardProps {
  onLogout: () => void;
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('events');

  const renderContent = () => {
    switch (activeTab) {
      case 'events':
        return <EventManager />;
      case 'chefs':
        return <ChefManager />;
      case 'hosts':
        return <HostManager />;
      case 'venues':
        return <VenueManager />;
      case 'ai-queue':
        return <AIQueue />;
      default:
        return <EventManager />;
    }
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      onBack={onBack}
    >
      {renderContent()}
    </AdminLayout>
  );
};
