
export interface SocialLinks {
  instagram?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
}

export interface Chef {
  id: string;
  name: string;
  bio: string;
  culinaryStyle: string;
  imageUrl: string;
  socialLinks: SocialLinks;
  pastEventsCount: number;
  verified?: boolean;
  region?: string;
}

export interface Host {
  id: string;
  name: string;
  slug?: string | null;
  bio: string;
  specialty: string;
  role: 'sommelier' | 'mixologist' | 'whisky_ambassador' | 'wine_director' | 'beverage_director' | 'bartender' | 'other';
  roleTitle: string;
  imageUrl: string;
  socialLinks: SocialLinks;
  pastEventsCount: number;
  verified?: boolean;
  region?: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  capacity: number;
  fullAddress: string;
  images: string[];
  atmosphere: string[]; // e.g. ["Industrial", "Intimate", "Lush"]
}

export interface DiningEvent {
  id: string;
  title: string;
  chef: Chef | null;
  host: Host | null;
  venue: Venue | null;
  date: string;
  time: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  description: string;
  menuHighlights: string[];
  imageUrl: string;
  category: 'Chef Pairing' | 'Long Table' | 'Pop-up' | 'Secret Location' | 'Cooking Class' | string;
  sourceUrl?: string;
  isAiGenerated?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SearchState {
  query: string;
  results: DiningEvent[];
  sources: GroundingSource[];
  isSearching: boolean;
  error: string | null;
}
