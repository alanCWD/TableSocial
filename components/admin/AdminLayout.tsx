import React from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'events' | 'chefs' | 'venues' | 'ai-queue';
  onTabChange: (tab: 'events' | 'chefs' | 'venues' | 'ai-queue') => void;
  onLogout: () => void;
  onBack: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onLogout,
  onBack,
}) => {
  const tabs = [
    { id: 'events' as const, label: 'Events', icon: '📅' },
    { id: 'chefs' as const, label: 'Chefs', icon: '👨‍🍳' },
    { id: 'venues' as const, label: 'Venues', icon: '🏠' },
    { id: 'ai-queue' as const, label: 'AI Queue', icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-culinary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-300 hover:text-white transition-colors"
            >
              ← Back to Site
            </button>
            <h1 className="text-2xl font-serif font-bold">TableSocial Admin</h1>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-300 hover:text-white transition-colors text-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-culinary'
                    : 'border-transparent text-gray-500 hover:text-culinary hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
};
