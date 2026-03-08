import { DiningEvent, GroundingSource } from "../types";

const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status >= 500 && i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};

const CHEF_PLACEHOLDERS = [
  '/images/chef-placeholder-1.svg',
  '/images/chef-placeholder-2.svg',
];

const HOST_PLACEHOLDERS = [
  '/images/host-placeholder-1.svg',
  '/images/host-placeholder-2.svg',
];

const getPlaceholderImage = (name: string, type: 'chef' | 'host'): string => {
  const placeholders = type === 'chef' ? CHEF_PLACEHOLDERS : HOST_PLACEHOLDERS;
  const hash = name ? name.charCodeAt(0) : 0;
  return placeholders[hash % placeholders.length];
};

const getCategoryImage = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('long table')) {
    return '/long-table-dinner.jpg';
  }
  if (categoryLower.includes('whisky') || categoryLower.includes('whiskey')) {
    return 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&q=80&w=800';
  }
  if (categoryLower.includes('wine')) {
    return 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800';
  }
  if (categoryLower.includes("chef's table") || categoryLower.includes('chefs table')) {
    return 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800';
  }
  if (categoryLower.includes('cocktail') || categoryLower.includes('mixology')) {
    return 'https://images.unsplash.com/photo-1536935338788-846e38e87d23?auto=format&fit=crop&q=80&w=800';
  }
  return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800';
};

export const fetchDiningEvents = async (location: string, force: boolean = false): Promise<{ events: DiningEvent[], sources: GroundingSource[] }> => {
  try {
    const url = `/api/discover?location=${encodeURIComponent(location)}${force ? '&force=true' : ''}`;
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      throw new Error('Failed to discover events');
    }
    
    const data = await response.json();
    
    return {
      events: data.events.map((event: any) => {
        const category = event.category || 'Dining Experience';
        return {
        id: event.id,
        title: event.title,
        category,
        date: event.date,
        time: event.time,
        price: event.price,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        description: event.description,
        menuHighlights: event.menuHighlights || [],
        imageUrl: event.imageUrl || getCategoryImage(category),
        chef: event.chef ? {
          id: event.chef.id,
          name: event.chef.name,
          bio: event.chef.bio,
          culinaryStyle: event.chef.culinaryStyle,
          imageUrl: event.chef.imageUrl || getPlaceholderImage(event.chef.name, 'chef'),
          pastEventsCount: event.chef.pastEventsCount,
          socialLinks: event.chef.socialLinks || {},
          verified: event.chef.verified || false,
        } : null,
        venue: event.venue ? {
          id: event.venue.id,
          name: event.venue.name,
          description: event.venue.description,
          capacity: event.venue.capacity,
          fullAddress: event.venue.fullAddress,
          images: event.venue.images || [],
          atmosphere: event.venue.atmosphere || [],
        } : null,
        host: event.host ? {
          id: event.host.id,
          name: event.host.name,
          slug: event.host.slug,
          bio: event.host.bio || '',
          specialty: event.host.specialty || '',
          role: event.host.role || 'other',
          roleTitle: event.host.roleTitle || '',
          imageUrl: event.host.imageUrl || getPlaceholderImage(event.host.name, 'host'),
          socialLinks: event.host.socialLinks || {},
          pastEventsCount: event.host.pastEventsCount || 0,
          verified: event.host.verified || false,
          region: event.host.region || '',
        } : null,
        };
      }),
      sources: data.sources || [],
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};
