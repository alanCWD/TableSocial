
import React from 'react';
import { DiningEvent } from '../types';

interface EventCardProps {
  event: DiningEvent;
  onClick: (event: DiningEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const highlights = event.menuHighlights || [];
  const chefName = event.chef?.name || "Guest Chef";
  const hostData = event.host ? event.host : (event as any).hostName ? {
    name: (event as any).hostName,
    roleTitle: (event as any).hostRole,
    imageUrl: null
  } : null;
  const venueName = event.venue?.name || "Private Venue";
  const venueAddress = event.venue?.fullAddress || "";
  const isAi = (event as any).isAiGenerated;
  const sourceUrl = (event as any).sourceUrl || ((event as any).sourceUrls?.[0]);
  
  const getSourceLabel = (url: string) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase().replace('www.', '');
      if (hostname.includes('tock') || hostname.includes('exploretock')) return 'Tock';
      if (hostname.includes('instagram')) return 'Instagram';
      if (hostname.includes('eventbrite')) return 'Eventbrite';
      if (hostname.includes('showpass')) return 'Showpass';
      if (hostname.includes('hobfinefoods') || hostname.includes('hob')) return 'HOB Fine Foods';
      if (hostname.includes('vertexaisearch') || hostname.includes('google')) return 'Source';
      if (hostname.includes('facebook')) return 'Facebook';
      if (hostname.includes('twitter') || hostname.includes('x.com')) return 'X';
      const baseName = hostname.split('.')[0];
      return baseName.charAt(0).toUpperCase() + baseName.slice(1);
    } catch {
      return 'Source';
    }
  };
  
  return (
    <div 
      className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      onClick={() => onClick(event)}
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={event.imageUrl} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-culinary/80 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-widest">
            {event.category}
          </span>
          {isAi && (
            <span className="bg-purple-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md uppercase tracking-widest flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              AI Found
            </span>
          )}
        </div>
        <div className="absolute bottom-4 right-4">
          <div className="bg-white/95 px-3 py-1 rounded-lg text-culinary font-bold text-lg shadow-lg">
            ${event.price}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-serif text-xl font-bold text-culinary leading-tight">{event.title}</h3>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          {event.chef?.imageUrl && (
            <img 
              src={event.chef.imageUrl} 
              alt={chefName}
              className="w-8 h-8 rounded-full object-cover border-2 border-accent/20"
            />
          )}
          <div>
            <p className="text-accent font-semibold text-sm">{chefName.startsWith('Chef ') ? chefName : `Chef ${chefName}`}</p>
            {event.chef?.culinaryStyle && (
              <p className="text-gray-400 text-xs">{event.chef.culinaryStyle}</p>
            )}
          </div>
        </div>
        
        {hostData && hostData.name && (
          <div className="flex items-center gap-2 mb-3">
            {hostData.imageUrl ? (
              <img 
                src={hostData.imageUrl} 
                alt={hostData.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-purple-600 font-semibold text-sm">{hostData.name}</p>
              <p className="text-gray-400 text-xs">{hostData.roleTitle || 'Pairing Specialist'}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-2 mb-3">
          <svg className="w-3.5 h-3.5 text-culinary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Venue</p>
            <p className="text-gray-700 font-semibold text-sm">{venueName}</p>
            {venueAddress && <p className="text-gray-400 text-xs">{venueAddress}</p>}
          </div>
        </div>

        <div className="flex items-start gap-2 mb-4">
          <svg className="w-3.5 h-3.5 text-culinary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Date & Time</p>
            <p className="text-gray-700 font-semibold text-sm">{event.date}</p>
            {event.time && <p className="text-gray-400 text-xs">{event.time}</p>}
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {highlights.slice(0, 3).map((item, idx) => (
            <span key={idx} className="text-[9px] bg-gray-50 border border-gray-100 px-2 py-1 rounded-md uppercase tracking-wide font-medium text-gray-500">
              {item}
            </span>
          ))}
        </div>

        {sourceUrl && (
          <div className="mb-4">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 border border-gray-200 px-3 py-1.5 rounded-full hover:border-gray-300 hover:text-gray-500 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {getSourceLabel(sourceUrl)}
            </a>
          </div>
        )}

        <button className="w-full border border-culinary text-culinary py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a1a1a] hover:text-white hover:border-[#1a1a1a] transition-colors duration-200 shadow-sm">
          Experience Details
        </button>
      </div>
    </div>
  );
};
