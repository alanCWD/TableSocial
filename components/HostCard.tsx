
import React from 'react';
import { Host } from '../types';

interface HostCardProps {
  host: Host;
  onClick: (host: Host) => void;
}

const getRoleLabel = (role: string, roleTitle?: string): string => {
  if (roleTitle) return roleTitle;
  const roleLabels: Record<string, string> = {
    sommelier: 'Sommelier',
    mixologist: 'Mixologist',
    whisky_ambassador: 'Whisky Ambassador',
    wine_director: 'Wine Director',
    beverage_director: 'Beverage Director',
    bartender: 'Bartender',
    other: 'Beverage Specialist',
  };
  return roleLabels[role] || 'Beverage Specialist';
};

export const HostCard: React.FC<HostCardProps> = ({ host, onClick }) => {
  return (
    <div 
      className="group cursor-pointer flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
      onClick={() => onClick(host)}
    >
      <div className="relative w-full aspect-square mb-6 rounded-3xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300">
        <img 
          src={host.imageUrl} 
          alt={host.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-culinary/20 group-hover:bg-culinary/0 transition-colors" />
        
        {host.verified && (
          <div className="absolute top-4 right-4 bg-accent text-white p-1.5 rounded-full shadow-lg border-2 border-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.604.3 1.166.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        <div className="absolute bottom-4 left-0 right-0 px-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
          <span className="bg-white/90 backdrop-blur-md text-culinary text-[10px] font-bold py-2 px-4 rounded-full uppercase tracking-widest shadow-lg">
            View Profile
          </span>
        </div>
      </div>
      
      <h4 className="font-serif text-xl font-bold text-culinary mb-1 group-hover:text-accent transition-colors flex items-center gap-2">
        {host.name}
      </h4>
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
        {getRoleLabel(host.role, host.roleTitle)}
      </p>
    </div>
  );
};
