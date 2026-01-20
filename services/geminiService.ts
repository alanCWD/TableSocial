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

export const fetchDiningEvents = async (location: string, force: boolean = false): Promise<{ events: DiningEvent[], sources: GroundingSource[] }> => {
  try {
    const url = `/api/discover?location=${encodeURIComponent(location)}${force ? '&force=true' : ''}`;
    const response = await fetchWithRetry(url);
    
    if (!response.ok) {
      throw new Error('Failed to discover events');
    }
    
    const data = await response.json();
    
    return {
      events: data.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        category: event.category || 'Dining Experience',
        date: event.date,
        time: event.time,
        price: event.price,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        description: event.description,
        menuHighlights: event.menuHighlights || [],
        imageUrl: event.imageUrl || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
        chef: event.chef ? {
          id: event.chef.id,
          name: event.chef.name,
          bio: event.chef.bio,
          culinaryStyle: event.chef.culinaryStyle,
          imageUrl: event.chef.imageUrl || 'https://images.unsplash.com/photo-1583394293214-28dea15ee548?auto=format&fit=crop&q=80&w=400',
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
          imageUrl: event.host.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=400',
          socialLinks: event.host.socialLinks || {},
          pastEventsCount: event.host.pastEventsCount || 0,
          verified: event.host.verified || false,
          region: event.host.region || '',
        } : null,
      })),
      sources: data.sources || [],
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};
