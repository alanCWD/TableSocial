
import React, { useState } from 'react';
import { DiningEvent, Chef, Venue } from '../types';

interface EventModalProps {
  event: DiningEvent | null;
  onClose: () => void;
  onViewChef: (chef: Chef) => void;
  onViewVenue: (venue: Venue) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose, onViewChef, onViewVenue }) => {
  const [bookingCount, setBookingCount] = useState(1);
  const [isBooked, setIsBooked] = useState(false);

  if (!event) return null;

  const handleBooking = () => {
    setIsBooked(true);
    setTimeout(() => {
      onClose();
      setIsBooked(false);
    }, 3000);
  };

  const highlights = event.menuHighlights || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-culinary/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-[#faf9f6] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {isBooked ? (
          <div className="p-12 text-center py-24">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-serif font-bold text-culinary mb-2">Reservation Confirmed!</h2>
            <p className="text-gray-600 mb-8 font-light">We've sent your digital pass to your inbox. Get ready for an extraordinary night at {event.venue?.name}.</p>
            <p className="text-sm text-gray-400">Returning to discovery...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 h-64 md:h-auto relative">
              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-culinary/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 text-white pr-6">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-accent font-bold uppercase tracking-widest text-[10px]">{event.category}</p>
                  {(event as any).isAiGenerated && (
                    <span className="bg-purple-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      AI Discovered
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-serif font-bold leading-tight">{event.title}</h2>
              </div>
            </div>

            <div className="md:w-1/2 p-8 lg:p-12">
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-14 h-14 rounded-full overflow-hidden cursor-pointer border-2 border-white shadow-md hover:scale-105 transition-transform bg-gray-100"
                    onClick={() => event.chef && onViewChef(event.chef)}
                  >
                    {event.chef?.imageUrl ? (
                      <img src={event.chef.imageUrl} className="w-full h-full object-cover" alt={event.chef?.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <button 
                      onClick={() => event.chef && onViewChef(event.chef)}
                      className="text-xs text-gray-400 uppercase font-bold tracking-widest hover:text-accent transition-colors"
                    >
                      Master Chef
                    </button>
                    <p 
                      onClick={() => event.chef && onViewChef(event.chef)}
                      className="font-serif text-xl font-bold text-culinary cursor-pointer hover:underline"
                    >
                      {event.chef?.name}
                    </p>
                  </div>
                </div>

                {(event as any).host && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100">
                      {(event as any).host.imageUrl ? (
                        <img src={(event as any).host.imageUrl} className="w-full h-full object-cover" alt={(event as any).host.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">
                        Pairing Specialist
                      </p>
                      <p className="font-serif text-xl font-bold text-culinary">
                        {(event as any).host.name}
                      </p>
                      {(event as any).host.roleTitle && (
                        <p className="text-gray-500 text-sm">{(event as any).host.roleTitle}</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-gray-600 leading-relaxed mb-8 italic font-light text-lg">
                  "{event.description}"
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div 
                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => event.venue && onViewVenue(event.venue)}
                  >
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Venue</p>
                    <p className="text-sm font-bold text-culinary line-clamp-1">{event.venue?.name || "Private Venue"}</p>
                    {event.venue?.fullAddress && (
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{event.venue.fullAddress}</p>
                    )}
                    <p className="text-[10px] text-accent font-bold mt-1 uppercase tracking-tight">View Location Profile →</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Date & Time</p>
                    <p className="text-sm font-bold text-culinary">{event.date}</p>
                    <p className="text-xs text-gray-500">{event.time}</p>
                  </div>
                </div>
                
                {(event as any).isAiGenerated && event.sourceUrl && (
                  <div className="mb-6 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <p className="text-[10px] text-purple-600 uppercase font-bold tracking-wider mb-1">Source</p>
                    <a 
                      href={event.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-purple-700 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      View Original Listing
                    </a>
                  </div>
                )}

                <h4 className="text-xs font-bold uppercase tracking-widest text-culinary mb-4 border-b pb-2 border-gray-100">The Menu Journey</h4>
                <ul className="grid grid-cols-1 gap-3 mb-8">
                  {highlights.map((dish, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 font-light">
                      <span className="text-accent mt-1 flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12"/></svg>
                      </span>
                      {dish}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-culinary uppercase tracking-widest">Reserve Seats</span>
                  <div className="flex items-center gap-5">
                    <button 
                      onClick={() => setBookingCount(Math.max(1, bookingCount - 1))}
                      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-bold text-lg">{bookingCount}</span>
                    <button 
                      onClick={() => setBookingCount(Math.min(event.availableSeats, bookingCount + 1))}
                      className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleBooking}
                  className="w-full bg-culinary text-white py-4 rounded-xl font-bold tracking-[0.1em] uppercase hover:bg-opacity-90 transition-all shadow-xl shadow-culinary/20"
                >
                  Confirm Booking • ${(event.price * bookingCount).toFixed(2)}
                </button>
                <p className="text-[9px] text-center text-gray-400 uppercase tracking-widest">Only {event.availableSeats} spots remain for this communal experience</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
