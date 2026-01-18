
import React, { useState, useEffect } from 'react';
import { Host } from '../types';
import { HostCard } from './HostCard';

interface ForDrinkSpecialistsProps {
  onHostClick: (host: Host) => void;
}

export const ForDrinkSpecialists: React.FC<ForDrinkSpecialistsProps> = ({ onHostClick }) => {
  const [filter, setFilter] = useState('All');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hosts')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch hosts');
        return res.json();
      })
      .then(data => {
        const hostsData = data.map((h: any) => ({
          id: h.id,
          name: h.name,
          slug: h.slug || null,
          bio: h.bio || '',
          specialty: h.specialty || '',
          role: h.role || 'other',
          roleTitle: h.roleTitle || '',
          imageUrl: h.imageUrl || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600',
          pastEventsCount: h.pastEventsCount || 0,
          verified: h.verified || false,
          region: h.region || 'Victoria, BC',
          socialLinks: h.socialLinks || {},
        }));
        setHosts(hostsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  
  const roles = ['All', 'Sommelier', 'Mixologist', 'Whisky Ambassador'];
  const filteredHosts = filter === 'All' 
    ? hosts 
    : hosts.filter(h => {
        const roleLabel = h.roleTitle || h.role.replace('_', ' ');
        return roleLabel.toLowerCase().includes(filter.toLowerCase());
      });

  return (
    <div className="bg-[#faf9f6]">
      <section className="bg-culinary text-white py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-accent font-bold uppercase tracking-[0.4em] text-xs mb-6">The Specialists Portal</h2>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-8">Elevate The Pour.</h1>
          <p className="text-gray-300 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
            The destination for Victoria's elite sommeliers, mixologists, and beverage ambassadors to showcase their craft and connect with discerning hosts.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <button className="bg-accent text-culinary font-bold px-10 py-4 rounded-2xl hover:bg-white transition-all uppercase tracking-widest text-xs">Verify Your Profile</button>
            <button className="border-2 border-white text-white font-bold px-10 py-4 rounded-2xl hover:bg-white hover:text-culinary transition-all uppercase tracking-widest text-xs">Host a Tasting</button>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div>
            <h2 className="text-xs font-bold text-accent uppercase tracking-[0.4em] mb-4">Registry</h2>
            <h3 className="text-4xl font-serif font-bold text-culinary">The Victoria Collective</h3>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {roles.map(r => (
              <button 
                key={r}
                onClick={() => setFilter(r)}
                className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === r ? 'bg-culinary text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-accent'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-pulse text-gray-400">Loading specialists...</div>
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              No drink specialists found yet.
            </div>
          ) : (
            filteredHosts.map(host => (
              <HostCard key={host.id} host={host} onClick={onHostClick} />
            ))
          )}
        </div>
      </section>

      <section className="py-24 px-6 bg-white border-y border-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="aspect-video bg-[#faf9f6] rounded-[3rem] p-12 border border-gray-100 shadow-inner flex flex-col justify-center">
              <div className="flex gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                  🍷
                </div>
                <div className="flex-grow space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-accent/20 flex justify-between items-center">
                  <span className="text-xs font-bold text-culinary uppercase">Verified Badge</span>
                  <div className="text-accent">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-100 text-gray-400 text-xs italic">
                  Link your certifications, portfolio, and specialties to showcase your expertise.
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-accent font-bold uppercase tracking-[0.3em] text-xs mb-4">Complete Your Story</h3>
              <h2 className="text-4xl font-serif font-bold text-culinary mb-8">Showcase Your Craft.</h2>
              <p className="text-gray-500 font-light leading-relaxed mb-8">
                Whether you're a certified sommelier, master mixologist, or brand ambassador, creating an official profile allows you to connect with chefs and venues seeking your expertise for their next event.
              </p>
              <ul className="space-y-4 mb-10">
                {['Certification Showcase', 'Event Portfolio', 'Direct Booking Requests', 'Pairing Analytics'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium text-culinary">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button className="bg-culinary text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-accent transition-all">
                Access Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
