
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
  chef: Chef;
  venue: Venue;
  date: string;
  time: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  description: string;
  menuHighlights: string[];
  imageUrl: string;
  category: 'Chef Pairing' | 'Long Table' | 'Pop-up' | 'Secret Location';
  sourceUrl?: string;
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
