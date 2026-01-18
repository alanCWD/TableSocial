import React, { useState, useEffect } from 'react';

interface HostData {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  role: string | null;
  roleTitle: string | null;
  specialty: string | null;
  region: string | null;
  imageUrl: string | null;
  verified: boolean | null;
  socialLinks: { instagram?: string; website?: string } | null;
  events: Array<{
    id: string;
    title: string;
    slug: string | null;
    date: string | null;
    time: string | null;
    imageUrl: string | null;
    category: string | null;
  }>;
  jsonLd: object;
}

interface HostPageProps {
  slug: string;
  onBack: () => void;
  onEventClick?: (slug: string) => void;
}

const roleDisplayNames: Record<string, string> = {
  sommelier: 'Sommelier',
  mixologist: 'Mixologist',
  whisky_ambassador: 'Whisky Ambassador',
  wine_director: 'Wine Director',
  beverage_director: 'Beverage Director',
  bartender: 'Bartender',
  other: 'Drink Specialist',
};

export const HostPage: React.FC<HostPageProps> = ({ slug, onBack, onEventClick }) => {
  const [host, setHost] = useState<HostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/host/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Host not found');
        return res.json();
      })
      .then(data => {
        setHost(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (host?.jsonLd) {
      const existingScript = document.getElementById('host-jsonld');
      if (existingScript) existingScript.remove();
      const script = document.createElement('script');
      script.id = 'host-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(host.jsonLd);
      document.head.appendChild(script);
      return () => { script.remove(); };
    }
  }, [host]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="text-gray-500 mb-4">Host not found</div>
        <button onClick={onBack} className="text-purple-600 hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  const displayRole = host.roleTitle || (host.role ? roleDisplayNames[host.role] : 'Drink Specialist');

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
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3">
              {host.imageUrl ? (
                <img
                  src={host.imageUrl}
                  alt={host.name}
                  className="w-full h-64 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full bg-purple-100 flex items-center justify-center text-6xl text-purple-300">
                  🍷
                </div>
              )}
            </div>
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-serif font-bold text-culinary">{host.name}</h1>
                {host.verified && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    Verified
                  </span>
                )}
              </div>
              
              <p className="text-purple-600 font-medium mb-4">{displayRole}</p>
              
              {host.specialty && (
                <p className="text-gray-600 text-sm mb-2">
                  <span className="font-medium">Specialty:</span> {host.specialty}
                </p>
              )}
              
              {host.region && (
                <p className="text-gray-500 text-sm mb-4">
                  <span className="inline-block mr-1">📍</span>
                  {host.region}
                </p>
              )}
              
              {host.bio && (
                <p className="text-gray-600 leading-relaxed mb-6">{host.bio}</p>
              )}

              {host.socialLinks && (
                <div className="flex gap-4">
                  {host.socialLinks.website && (
                    <a
                      href={host.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline text-sm"
                    >
                      Website
                    </a>
                  )}
                  {host.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${host.socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline text-sm"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {host.events.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-serif font-bold text-culinary mb-4">Upcoming Events</h2>
            <div className="grid gap-4">
              {host.events.map(event => (
                <div
                  key={event.id}
                  onClick={() => event.slug && onEventClick?.(event.slug)}
                  className="bg-white rounded-xl shadow-sm p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center text-2xl text-gray-400">
                      🍽️
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-culinary">{event.title}</h3>
                    {event.date && (
                      <p className="text-sm text-gray-500">{event.date}</p>
                    )}
                    {event.category && (
                      <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {event.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
