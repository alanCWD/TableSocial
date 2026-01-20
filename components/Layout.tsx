
import React, { useState } from 'react';

interface User {
  id: string;
  name: string;
  profileImage?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: 'explore' | 'how-it-works' | 'for-chefs' | 'for-drink-specialists' | 'admin') => void;
  currentPage: string;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onNavigate, 
  currentPage,
  user,
  onSignIn,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (page: 'explore' | 'how-it-works' | 'for-chefs' | 'for-drink-specialists' | 'admin') => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-culinary text-white py-4 px-4 md:py-6 md:px-8 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate('explore')}>
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-culinary">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight">TableSocial</span>
          </div>
          
          <nav className="hidden md:flex gap-8 text-sm uppercase tracking-widest font-medium">
            <button 
              onClick={() => handleNavigate('explore')} 
              className={`${currentPage === 'explore' ? 'text-accent' : 'text-gray-400'} hover:text-accent transition-colors`}
            >
              Explore
            </button>
            <button 
              onClick={() => handleNavigate('how-it-works')} 
              className={`${currentPage === 'how-it-works' ? 'text-accent' : 'text-gray-400'} hover:text-accent transition-colors`}
            >
              How it works
            </button>
            <button 
              onClick={() => handleNavigate('for-chefs')} 
              className={`${currentPage === 'for-chefs' ? 'text-accent' : 'text-gray-400'} hover:text-accent transition-colors`}
            >
              For Chefs
            </button>
            <button 
              onClick={() => handleNavigate('for-drink-specialists')} 
              className={`${currentPage === 'for-drink-specialists' ? 'text-accent' : 'text-gray-400'} hover:text-accent transition-colors`}
            >
              For Drink Specialists
            </button>
          </nav>
          
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <button
                  onClick={() => handleNavigate('admin')}
                  className="text-gray-400 hover:text-accent text-sm uppercase tracking-widest font-medium transition-colors"
                >
                  Admin
                </button>
                <div className="flex items-center gap-2">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-culinary font-bold text-sm">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <button
                    onClick={onSignOut}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onSignIn}
                className="bg-accent text-culinary px-5 py-2 rounded-full font-semibold text-sm hover:bg-opacity-90 transition-all"
              >
                Sign In
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-700 pt-4">
            <nav className="flex flex-col gap-4">
              <button 
                onClick={() => handleNavigate('explore')} 
                className={`${currentPage === 'explore' ? 'text-accent' : 'text-gray-300'} text-left text-base font-medium hover:text-accent transition-colors`}
              >
                Explore
              </button>
              <button 
                onClick={() => handleNavigate('how-it-works')} 
                className={`${currentPage === 'how-it-works' ? 'text-accent' : 'text-gray-300'} text-left text-base font-medium hover:text-accent transition-colors`}
              >
                How it works
              </button>
              <button 
                onClick={() => handleNavigate('for-chefs')} 
                className={`${currentPage === 'for-chefs' ? 'text-accent' : 'text-gray-300'} text-left text-base font-medium hover:text-accent transition-colors`}
              >
                For Chefs
              </button>
              <button 
                onClick={() => handleNavigate('for-drink-specialists')} 
                className={`${currentPage === 'for-drink-specialists' ? 'text-accent' : 'text-gray-300'} text-left text-base font-medium hover:text-accent transition-colors`}
              >
                For Drink Specialists
              </button>
              
              <div className="border-t border-gray-700 pt-4 mt-2">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleNavigate('admin')}
                      className="text-gray-300 text-left text-base font-medium hover:text-accent transition-colors"
                    >
                      Admin Dashboard
                    </button>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-culinary font-bold text-sm">
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-gray-300 text-sm">{user.name}</span>
                      </div>
                      <button
                        onClick={() => { onSignOut?.(); setMobileMenuOpen(false); }}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { onSignIn?.(); setMobileMenuOpen(false); }}
                    className="w-full bg-accent text-culinary py-3 rounded-full font-semibold text-sm hover:bg-opacity-90 transition-all"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
      
      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-culinary text-gray-400 py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-white font-serif text-xl mb-4">TableSocial</h3>
            <p className="text-sm leading-relaxed">
              Redefining communal dining through curated private events, bridging the gap between extraordinary chefs and curious diners.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate('explore')} className="hover:text-accent">Search Events</button></li>
              <li><button onClick={() => onNavigate('for-chefs')} className="hover:text-accent">Partner with us</button></li>
              <li><a href="#" className="hover:text-accent">Safety Guidelines</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Newsletter</h4>
            <p className="text-sm mb-4">Get notified about exclusive pop-ups in your area.</p>
            <div className="flex">
              <input type="email" placeholder="Email address" className="bg-gray-900 border-none px-4 py-2 rounded-l w-full text-white text-sm" />
              <button className="bg-accent text-culinary px-4 py-2 rounded-r font-bold text-sm">Join</button>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center text-xs border-t border-gray-800 pt-8">
          &copy; {new Date().getFullYear()} TableSocial Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
