
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from './components/Layout';
import { EventCard } from './components/EventCard';
import { EventModal } from './components/EventModal';
import { ProfileOverlay } from './components/ProfileOverlay';
import { ChefCard } from './components/ChefCard';
import { HostCard } from './components/HostCard';
import { ForChefs } from './components/ForChefs';
import { ForDrinkSpecialists } from './components/ForDrinkSpecialists';
import { HowItWorks } from './components/HowItWorks';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ChefPage } from './components/ChefPage';
import { EventPage } from './components/EventPage';
import { HostPage } from './components/HostPage';
import { DiningEvent, SearchState, Chef, Venue, Host } from './types';
import { fetchDiningEvents } from './services/geminiService';

type Page = 'explore' | 'how-it-works' | 'for-chefs' | 'for-drink-specialists' | 'admin';
type RouteType = { type: 'page'; page: Page } | { type: 'chef'; slug: string } | { type: 'event'; slug: string } | { type: 'host'; slug: string };

function parseRoute(): RouteType {
  const path = window.location.pathname;
  if (path.startsWith('/chef/')) {
    const slug = path.replace('/chef/', '');
    return { type: 'chef', slug };
  }
  if (path.startsWith('/event/')) {
    const slug = path.replace('/event/', '');
    return { type: 'event', slug };
  }
  if (path.startsWith('/host/')) {
    const slug = path.replace('/host/', '');
    return { type: 'host', slug };
  }
  if (path === '/how-it-works') {
    return { type: 'page', page: 'how-it-works' };
  }
  if (path === '/for-chefs') {
    return { type: 'page', page: 'for-chefs' };
  }
  if (path === '/for-drink-specialists') {
    return { type: 'page', page: 'for-drink-specialists' };
  }
  if (path === '/admin') {
    return { type: 'page', page: 'admin' };
  }
  return { type: 'page', page: 'explore' };
}

interface User {
  id: string;
  name: string;
  profileImage?: string;
}

const App: React.FC = () => {
  const [route, setRoute] = useState<RouteType>(parseRoute);
  const [currentPage, setCurrentPage] = useState<Page>('explore');
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState<SearchState>({
    query: '',
    results: [],
    sources: [],
    isSearching: false,
    error: null,
  });
  
  const [selectedEvent, setSelectedEvent] = useState<DiningEvent | null>(null);
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [locationInput, setLocationInput] = useState('Victoria, BC');
  const searchCounterRef = useRef(0);

  useEffect(() => {
    fetch('/api/auth/user')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.email || 'User';
          setUser({
            id: data.id,
            name,
            profileImage: data.profileImageUrl,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const newRoute = parseRoute();
      setRoute(newRoute);
      if (newRoute.type === 'page') {
        setCurrentPage(newRoute.page);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (route.type === 'page') {
      setCurrentPage(route.page);
    }
  }, [route]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parseRoute());
  };

  const navigateToPage = (page: Page) => {
    const pathMap: Record<Page, string> = {
      'explore': '/',
      'how-it-works': '/how-it-works',
      'for-chefs': '/for-chefs',
      'for-drink-specialists': '/for-drink-specialists',
      'admin': '/admin'
    };
    const path = pathMap[page];
    window.history.pushState({}, '', path);
    setRoute({ type: 'page', page });
    setCurrentPage(page);
  };

  const goHome = () => {
    window.history.pushState({}, '', '/');
    setRoute({ type: 'page', page: 'explore' });
    setCurrentPage('explore');
  };

  const handleSignIn = () => {
    window.location.href = '/api/login';
  };

  const handleSignOut = () => {
    window.location.href = '/api/logout';
  };

  const featuredChefs = useMemo(() => {
    const chefMap = new Map<string, Chef>();
    search.results.forEach(event => {
      if (event.chef && !chefMap.has(event.chef.id)) {
        chefMap.set(event.chef.id, event.chef);
      }
    });
    return Array.from(chefMap.values());
  }, [search.results]);

  const featuredHosts = useMemo(() => {
    const hostMap = new Map<string, Host>();
    search.results.forEach(event => {
      if (event.host && event.host.id && !hostMap.has(event.host.id)) {
        hostMap.set(event.host.id, event.host as Host);
      }
    });
    return Array.from(hostMap.values());
  }, [search.results]);

  useEffect(() => {
    handleSearch('Victoria, BC');
  }, []);

  const handleSearch = async (loc: string, force: boolean = false) => {
    const currentSearch = ++searchCounterRef.current;
    setSearch(prev => ({ ...prev, isSearching: true, error: null, query: loc }));
    try {
      const data = await fetchDiningEvents(loc, force);
      if (currentSearch !== searchCounterRef.current) return;
      setSearch({
        query: loc,
        results: data.events,
        sources: data.sources,
        isSearching: false,
        error: null
      });
    } catch (err) {
      if (currentSearch !== searchCounterRef.current) return;
      setSearch({
        query: loc,
        results: [],
        sources: [],
        isSearching: false,
        error: "Failed to curate experiences. Please try another city."
      });
    }
  };

  const handleRecurate = () => {
    handleSearch(search.query, true);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationInput.trim()) {
      handleSearch(locationInput);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'admin':
        return (
          <AdminDashboard
            onLogout={handleSignOut}
            onBack={() => setCurrentPage('explore')}
          />
        );
      case 'how-it-works':
        return <HowItWorks />;
      case 'for-chefs':
        return <ForChefs onChefClick={setSelectedChef} />;
      case 'for-drink-specialists':
        return <ForDrinkSpecialists onHostClick={(host) => host.slug && navigateTo(`/host/${host.slug}`)} />;
      case 'explore':
      default:
        return (
          <>
            {/* Hero Section */}
            <section className="relative min-h-[85vh] md:h-[65vh] flex items-center justify-center overflow-hidden bg-culinary py-12 md:py-0">
              <div className="absolute inset-0 z-0 scale-105">
                <video 
                  src="/hero-video.mp4"
                  className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              
              <div className="relative z-10 w-full max-w-4xl px-6 text-center">
                <span className="text-accent font-bold uppercase tracking-[0.3em] text-xs mb-4 block animate-in fade-in duration-1000">Exclusive Table Access</span>
                <h1 className="text-4xl md:text-7xl text-white font-serif font-bold mb-6 md:mb-8 leading-[1.1] animate-in slide-in-from-bottom-8 duration-1000">
                  Dine with <span className="text-accent italic">Intention</span>
                </h1>
                <p className="text-gray-300 text-base md:text-xl mb-8 md:mb-12 font-light tracking-wide max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-200">
                  Join a collective of culinary seekers at secret pop-ups and chef's tables in {search.query}.
                </p>

                <form onSubmit={onSearchSubmit} className="flex flex-col md:flex-row gap-3 max-w-2xl mx-auto animate-in slide-in-from-bottom-12 duration-1000 delay-300">
                  <div className="flex-grow relative group">
                    <input 
                      type="text" 
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Enter your city..." 
                      className="w-full px-8 py-5 rounded-2xl bg-white/95 text-culinary font-medium focus:outline-none focus:ring-2 focus:ring-accent shadow-2xl transition-all"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-accent">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="bg-accent text-culinary font-bold px-12 py-5 rounded-2xl hover:bg-white transition-all shadow-xl tracking-widest uppercase text-xs"
                  >
                    {search.isSearching ? 'Curating...' : 'Discover Tables'}
                  </button>
                </form>
              </div>
            </section>

            {/* Discovery Section */}
            <section className="max-w-7xl mx-auto px-6 py-24">
              <div className="flex flex-col lg:flex-row justify-between items-baseline mb-16 gap-8">
                <div>
                  <h2 className="text-xs font-bold text-accent uppercase tracking-[0.4em] mb-4">Current Curations</h2>
                  <h3 className="text-5xl font-serif font-bold text-culinary">
                    Available in {search.query}
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                  {['All Experiences', 'Chef Pairing', 'Pop-up', 'Secret Location'].map((filter) => (
                    <button key={filter} className="px-6 py-3 rounded-xl border border-gray-100 text-xs uppercase tracking-widest font-bold text-gray-400 hover:border-accent hover:text-accent transition-all">
                      {filter}
                    </button>
                  ))}
                  <button 
                    onClick={handleRecurate}
                    disabled={search.isSearching}
                    className="ml-auto px-6 py-3 rounded-xl bg-accent text-white text-xs uppercase tracking-widest font-bold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className={`w-4 h-4 ${search.isSearching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Events
                  </button>
                </div>
              </div>

              {search.isSearching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                      <div className="animate-pulse bg-gray-200 h-64" />
                      <div className="p-6 space-y-4">
                        <div className="animate-pulse bg-gray-200 h-6 w-3/4 rounded" />
                        <div className="animate-pulse bg-gray-200 h-4 w-1/2 rounded" />
                        <div className="animate-pulse bg-gray-200 h-10 w-full rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : search.error ? (
                <div className="bg-[#faf9f6] border border-red-100 text-red-800 p-12 rounded-3xl text-center max-w-xl mx-auto shadow-sm">
                  <p className="font-serif text-2xl font-bold mb-4">Discovery Interrupted</p>
                  <p className="font-light mb-8">{search.error}</p>
                  <button onClick={() => handleSearch(search.query)} className="bg-culinary text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs">Try Again</button>
                </div>
              ) : search.results.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {search.results.map((event) => (
                      <EventCard key={event.id} event={event} onClick={setSelectedEvent} />
                    ))}
                  </div>

                  {featuredChefs.length > 0 && (
                    <div className="mt-32">
                      <div className="text-center mb-16">
                        <h2 className="text-xs font-bold text-accent uppercase tracking-[0.4em] mb-4">The Artisans</h2>
                        <h3 className="text-4xl font-serif font-bold text-culinary">Meet Your Hosts</h3>
                        <p className="text-gray-400 font-light mt-4 max-w-xl mx-auto leading-relaxed">Extraordinary dining starts with an extraordinary chef.</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {featuredChefs.map(chef => (
                          <ChefCard key={chef.id} chef={chef} onClick={setSelectedChef} />
                        ))}
                      </div>
                    </div>
                  )}

                  {featuredHosts.length > 0 && (
                    <div className="mt-32">
                      <div className="text-center mb-12">
                        <h2 className="text-xs font-bold text-accent uppercase tracking-[0.4em] mb-4">The Connoisseurs</h2>
                        <h3 className="text-4xl font-serif font-bold text-culinary">Pairing Specialists</h3>
                      </div>
                      <div className="flex justify-center gap-12 flex-wrap">
                        {featuredHosts.map(host => (
                          <HostCard key={host.id} host={host} onClick={() => navigateTo(`/host/${host.slug}`)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {search.sources.length > 0 && (
                    <div className="mt-32 border-t border-gray-100 pt-16">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-grow bg-gray-100" />
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300">Marketplace Sources</h4>
                        <div className="h-px flex-grow bg-gray-100" />
                      </div>
                      <div className="flex flex-wrap justify-center gap-4">
                        {search.sources.map((source, i) => (
                          <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-white hover:border-accent text-gray-400 py-3 px-6 rounded-full border border-gray-100 uppercase tracking-widest font-bold">{source.title}</a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border border-gray-100">
                  <div className="w-24 h-24 bg-[#faf9f6] rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">🥘</div>
                  <h4 className="text-3xl font-serif font-bold text-culinary mb-4">No Seats Found</h4>
                </div>
              )}
            </section>
          </>
        );
    }
  };

  if (route.type === 'chef') {
    return (
      <ChefPage
        slug={route.slug}
        onBack={goHome}
        onEventClick={(slug) => navigateTo(`/event/${slug}`)}
      />
    );
  }

  if (route.type === 'event') {
    return (
      <EventPage
        slug={route.slug}
        onBack={goHome}
        onChefClick={(slug) => navigateTo(`/chef/${slug}`)}
      />
    );
  }

  if (route.type === 'host') {
    return (
      <HostPage
        slug={route.slug}
        onBack={goHome}
        onEventClick={(slug) => navigateTo(`/event/${slug}`)}
      />
    );
  }

  if (currentPage === 'admin') {
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
            <h2 className="text-2xl font-serif font-bold text-culinary mb-4">Admin Access</h2>
            <p className="text-gray-600 mb-6">Please sign in to access the admin dashboard.</p>
            <button
              onClick={handleSignIn}
              className="bg-accent text-culinary px-8 py-3 rounded-lg font-bold hover:bg-accent/90 transition-colors"
            >
              Sign In with Replit
            </button>
            <button
              onClick={() => setCurrentPage('explore')}
              className="block w-full mt-4 text-gray-500 hover:text-culinary transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return renderContent();
  }

  return (
    <Layout
      onNavigate={navigateToPage}
      currentPage={currentPage}
      user={user}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
    >
      {renderContent()}

      <EventModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        onViewChef={(chef) => setSelectedChef(chef)}
        onViewVenue={(venue) => setSelectedVenue(venue)}
      />

      <ProfileOverlay 
        chef={selectedChef} 
        venue={selectedVenue} 
        onClose={() => {
          setSelectedChef(null);
          setSelectedVenue(null);
        }}
      />
    </Layout>
  );
};

export default App;
