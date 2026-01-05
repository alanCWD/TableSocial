import React, { useState, useEffect } from 'react';

interface AiIngestion {
  id: string;
  eventId?: string | null;
  payload: any;
  aiHash?: string | null;
  locationQuery?: string | null;
  retrievedAt: string;
  approved: boolean;
}

export const AIQueue: React.FC = () => {
  const [ingestions, setIngestions] = useState<AiIngestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchIngestions();
  }, []);

  const fetchIngestions = async () => {
    try {
      const response = await fetch('/api/admin/ai-ingestions');
      const data = await response.json();
      setIngestions(data);
    } catch (err) {
      console.error('Failed to fetch AI ingestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/admin/ai-ingestions/${id}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      await fetchIngestions();
    } catch (err) {
      console.error('Failed to approve ingestion:', err);
      alert('Failed to approve. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this AI-discovered event?')) return;

    setProcessing(id);
    try {
      const response = await fetch(`/api/admin/ai-ingestions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      await fetchIngestions();
    } catch (err) {
      console.error('Failed to reject ingestion:', err);
      alert('Failed to reject. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading AI queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-culinary">AI Discovery Queue</h2>
          <p className="text-gray-500 mt-1">
            Review and approve events discovered by Gemini AI
          </p>
        </div>
        <button
          onClick={fetchIngestions}
          className="text-accent hover:underline text-sm"
        >
          Refresh
        </button>
      </div>

      {ingestions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-culinary mb-2">Queue Empty</h3>
          <p className="text-gray-500">
            No AI-discovered events waiting for review. Events will appear here when
            users search for locations with new discoveries.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ingestions.map((ingestion) => {
            const payload = ingestion.payload || {};
            return (
              <div
                key={ingestion.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-medium text-accent uppercase tracking-wider">
                      AI Discovered
                    </span>
                    <h3 className="text-xl font-bold text-culinary mt-1">
                      {payload.title || 'Untitled Event'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Location: {ingestion.locationQuery || 'Unknown'} | Retrieved:{' '}
                      {new Date(ingestion.retrievedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(ingestion.id)}
                      disabled={processing === ingestion.id}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {processing === ingestion.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(ingestion.id)}
                      disabled={processing === ingestion.id}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Event Details</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Category:</dt>
                        <dd>{payload.category || '—'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Date:</dt>
                        <dd>{payload.date || '—'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Time:</dt>
                        <dd>{payload.time || '—'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Price:</dt>
                        <dd>{payload.price ? `$${payload.price}` : '—'}</dd>
                      </div>
                      <div className="flex">
                        <dt className="text-gray-500 w-24">Seats:</dt>
                        <dd>{payload.totalSeats || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  {payload.chef && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Chef</h4>
                      <dl className="space-y-1 text-sm">
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Name:</dt>
                          <dd>{payload.chef.name || '—'}</dd>
                        </div>
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Style:</dt>
                          <dd>{payload.chef.culinaryStyle || '—'}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {payload.venue && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Venue</h4>
                      <dl className="space-y-1 text-sm">
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Name:</dt>
                          <dd>{payload.venue.name || '—'}</dd>
                        </div>
                        <div className="flex">
                          <dt className="text-gray-500 w-24">Address:</dt>
                          <dd>{payload.venue.fullAddress || '—'}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {payload.description && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{payload.description}</p>
                    </div>
                  )}

                  {payload.menuHighlights && payload.menuHighlights.length > 0 && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Menu Highlights</h4>
                      <div className="flex flex-wrap gap-2">
                        {payload.menuHighlights.map((item: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
