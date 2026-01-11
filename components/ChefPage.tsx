import React, { useState, useEffect } from 'react';

interface ChefData {
  id: string;
  name: string;
  slug: string | null;
  bio: string | null;
  culinaryStyle: string | null;
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

interface ChefPageProps {
  slug: string;
  onBack: () => void;
  onEventClick?: (slug: string) => void;
}

export const ChefPage: React.FC<ChefPageProps> = ({ slug, onBack, onEventClick }) => {
  const [chef, setChef] = useState<ChefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/chef/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Chef not found');
        return res.json();
      })
      .then(data => {
        setChef(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (chef?.jsonLd) {
      const existingScript = document.getElementById('chef-jsonld');
      if (existingScript) existingScript.remove();
      const script = document.createElement('script');
      script.id = 'chef-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(chef.jsonLd);
      document.head.appendChild(script);
      return () => { script.remove(); };
    }
  }, [chef]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-gray-500">Loading chef profile...</div>
      </div>
    );
  }

  if (error || !chef) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="text-gray-500 mb-4">Chef not found</div>
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
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3">
              {chef.imageUrl ? (
                <img
                  src={chef.imageUrl}
                  alt={chef.name}
                  className="w-full h-64 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full bg-gray-200 flex items-center justify-center text-6xl text-gray-400">
                  👨‍🍳
                </div>
              )}
            </div>
            <div className="md:w-2/3 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-serif font-bold text-culinary">{chef.name}</h1>
                {chef.verified && (
                  <span className="bg-accent text-culinary text-xs px-2 py-1 rounded-full font-medium">
                    Verified
                  </span>
                )}
              </div>
              
              {chef.culinaryStyle && (
                <p className="text-accent font-medium mb-4">{chef.culinaryStyle}</p>
              )}
              
              {chef.region && (
                <p className="text-gray-500 text-sm mb-4">
                  <span className="inline-block mr-1">📍</span>
                  {chef.region}
                </p>
              )}
              
              {chef.bio && (
                <p className="text-gray-600 leading-relaxed mb-6">{chef.bio}</p>
              )}

              {chef.socialLinks && (
                <div className="flex gap-4">
                  {chef.socialLinks.website && (
                    <a
                      href={chef.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-sm"
                    >
                      Website
                    </a>
                  )}
                  {chef.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${chef.socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-sm"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {chef.events.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-serif font-bold text-culinary mb-4">Upcoming Events</h2>
            <div className="grid gap-4">
              {chef.events.map(event => (
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
