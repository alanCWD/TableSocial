import { DiningEvent, GroundingSource } from "../types";

export const fetchDiningEvents = async (location: string): Promise<{ events: DiningEvent[], sources: GroundingSource[] }> => {
  try {
    const response = await fetch(`/api/discover?location=${encodeURIComponent(location)}`);
    
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
      })),
      sources: data.sources || [],
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};
