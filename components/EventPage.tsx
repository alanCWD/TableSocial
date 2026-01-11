import React, { useState, useEffect } from 'react';

interface EventData {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  date: string | null;
  time: string | null;
  price: number | null;
  category: string | null;
  imageUrl: string | null;
  menuHighlights: string[] | null;
  location: string | null;
  sourceUrls: string[] | null;
  hostName: string | null;
  hostBio: string | null;
  hostRole: string | null;
  chef: {
    id: string;
    name: string;
    slug: string | null;
    imageUrl: string | null;
    culinaryStyle: string | null;
  } | null;
  venue: {
    id: string;
    name: string;
    fullAddress: string | null;
  } | null;
  jsonLd: object;
}

interface EventPageProps {
  slug: string;
  onBack: () => void;
  onChefClick?: (slug: string) => void;
}

export const EventPage: React.FC<EventPageProps> = ({ slug, onBack, onChefClick }) => {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/event/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then(data => {
        setEvent(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (event?.jsonLd) {
      const existingScript = document.getElementById('event-jsonld');
      if (existingScript) existingScript.remove();
      const script = document.createElement('script');
      script.id = 'event-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(event.jsonLd);
      document.head.appendChild(script);
      return () => { script.remove(); };
    }
  }, [event]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-gray-500">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="text-gray-500 mb-4">Event not found</div>
        <button onClick={onBack} className="text-accent hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-culinary text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center">
          <button onClick={onBack} className="text-white/80 hover:text-white mr-4">
            &larr; Back
          </button>
          <span className="text-lg font-serif">TableSocial</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {event.imageUrl && (
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-6">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            {event.category && (
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 text-culinary text-sm px-3 py-1 rounded-full font-medium">
                  {event.category}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-serif font-bold text-culinary mb-4">{event.title}</h1>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              {event.date && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="font-medium text-culinary">{event.date}</div>
                    {event.time && <div className="text-sm text-gray-500">{event.time}</div>}
                  </div>
                </div>
              )}

              {event.venue && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <div className="font-medium text-culinary">{event.venue.name}</div>
                    {event.venue.fullAddress && (
                      <div className="text-sm text-gray-500">{event.venue.fullAddress}</div>
                    )}
                  </div>
                </div>
              )}

              {event.price && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="font-medium text-culinary">${event.price}</div>
                </div>
              )}
            </div>

            {event.chef && (
              <div
                onClick={() => event.chef?.slug && onChefClick?.(event.chef.slug)}
                className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {event.chef.imageUrl ? (
                  <img
                    src={event.chef.imageUrl}
                    alt={event.chef.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-400">
                    👨‍🍳
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500">Chef</div>
                  <div className="font-medium text-culinary">{event.chef.name}</div>
                  {event.chef.culinaryStyle && (
                    <div className="text-sm text-accent">{event.chef.culinaryStyle}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {event.hostName && (
            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="text-sm text-gray-500 mb-1">Hosted by</div>
              <div className="font-medium text-culinary">{event.hostName}</div>
              {event.hostRole && <div className="text-sm text-accent">{event.hostRole}</div>}
              {event.hostBio && <div className="text-sm text-gray-600 mt-1">{event.hostBio}</div>}
            </div>
          )}

          {event.description && (
            <div className="border-t border-gray-100 pt-6 mb-6">
              <h2 className="text-xl font-serif font-bold text-culinary mb-3">About This Event</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {event.menuHighlights && event.menuHighlights.length > 0 && (
            <div className="border-t border-gray-100 pt-6 mb-6">
              <h2 className="text-xl font-serif font-bold text-culinary mb-3">Menu Highlights</h2>
              <ul className="space-y-2">
                {event.menuHighlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-accent">✦</span>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.sourceUrls && event.sourceUrls.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-serif font-bold text-culinary mb-3">Book This Event</h2>
              <div className="flex flex-wrap gap-3">
                {event.sourceUrls.slice(0, 3).map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-accent text-culinary px-4 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
                  >
                    {idx === 0 ? 'Get Tickets' : 'View Source'}
                    <span>→</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
