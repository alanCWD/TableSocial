
import React from 'react';
import { DiningEvent } from '../types';

interface EventCardProps {
  event: DiningEvent;
  onClick: (event: DiningEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const highlights = event.menuHighlights || [];
  
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
        <div className="absolute top-4 left-4">
          <span className="bg-culinary/80 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-md uppercase tracking-widest">
            {event.category}
          </span>
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
        <p className="text-accent font-medium text-sm mb-4 uppercase tracking-tighter">Chef {event.chef?.name}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {event.date}
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {event.venue?.name}
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {highlights.slice(0, 2).map((item, idx) => (
            <span key={idx} className="text-[9px] bg-gray-50 border border-gray-100 px-2 py-1 rounded-md uppercase tracking-wide font-medium text-gray-500">
              {item}
            </span>
          ))}
        </div>

        <button className="w-full border border-culinary text-culinary py-2.5 rounded-xl font-bold text-sm group-hover:bg-culinary group-hover:text-white transition-all shadow-sm">
          Experience Details
        </button>
      </div>
    </div>
  );
};
