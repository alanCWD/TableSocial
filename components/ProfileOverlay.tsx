
import React from 'react';
import { Chef, Venue } from '../types';

interface ProfileOverlayProps {
  chef?: Chef | null;
  venue?: Venue | null;
  onClose: () => void;
}

export const ProfileOverlay: React.FC<ProfileOverlayProps> = ({ chef, venue, onClose }) => {
  if (!chef && !venue) return null;

  const isChef = !!chef;
  const title = isChef ? chef?.name : venue?.name;
  const subTitle = isChef ? chef?.culinaryStyle : `${venue?.capacity} Guest Capacity`;
  const mainImage = isChef ? chef?.imageUrl : (venue?.images?.[0] || '');
  const atmosphere = venue?.atmosphere || [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-culinary/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-[#faf9f6] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 max-h-[85vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-10 h-10 bg-culinary text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="relative h-64 md:h-80 w-full">
          <img src={mainImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f6] via-transparent to-transparent" />
        </div>

        <div className="px-8 pb-12 -mt-12 relative z-10">
          <div className="flex flex-col mb-8">
            <span className="text-accent font-bold uppercase tracking-widest text-xs mb-2 block">
              {isChef ? 'Master Chef Profile' : 'Curated Venue'}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-culinary leading-tight">{title}</h2>
            <p className="text-lg text-gray-500 font-medium mt-1">{subTitle}</p>
            
            {isChef && chef?.socialLinks && (
              <div className="flex gap-3 mt-4">
                {chef.socialLinks.website && (
                  <a href={chef.socialLinks.website} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:border-accent hover:text-accent transition-all text-gray-400" title="Website">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </a>
                )}
                {chef.socialLinks.instagram && (
                  <a href={chef.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:border-accent hover:text-accent transition-all text-gray-400" title="Instagram">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                )}
                {chef.socialLinks.twitter && (
                  <a href={chef.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-100 hover:border-accent hover:text-accent transition-all text-gray-400" title="Twitter">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-6">
              <section>
                <h4 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Background & Story</h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line font-light text-lg">
                  {isChef ? chef?.bio : venue?.description}
                </p>
              </section>

              {!isChef && venue && (
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Venue Vibe</h4>
                  <div className="flex flex-wrap gap-2">
                    {atmosphere.map((tag, i) => (
                      <span key={i} className="px-4 py-2 bg-white border border-gray-100 rounded-full text-sm text-gray-600 shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  {isChef ? 'Chef Insights' : 'Venue Details'}
                </h4>
                <div className="space-y-4">
                  {isChef ? (
                    <>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400">Past Events</p>
                        <p className="text-xl font-serif font-bold text-culinary">{chef?.pastEventsCount}+ Hosted</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400">Signature Style</p>
                        <p className="text-sm font-medium">{chef?.culinaryStyle}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400">Location</p>
                        <p className="text-sm font-medium">{venue?.fullAddress}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400">Capacity</p>
                        <p className="text-xl font-serif font-bold text-culinary">{venue?.capacity} Guests</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full py-4 border-2 border-culinary text-culinary rounded-xl font-bold hover:bg-culinary hover:text-white transition-all"
              >
                Back to Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
