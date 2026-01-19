import React, { useState, useEffect } from 'react';
import { ImageUploader } from './ImageUploader';

interface Venue {
  id: string;
  name: string;
  description?: string | null;
  capacity?: number | null;
  fullAddress?: string | null;
  images?: string[] | null;
  atmosphere?: string[] | null;
}

const extractCity = (address: string | null | undefined): string => {
  if (!address) return 'Unknown';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[0] || 'Unknown';
  }
  return parts[0] || 'Unknown';
};

export const VenueManager: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: '',
    fullAddress: '',
    imageUrl: '',
    atmosphere: '',
  });

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch('/api/admin/venues');
      const data = await response.json();
      setVenues(data);
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      capacity: '',
      fullAddress: '',
      imageUrl: '',
      atmosphere: '',
    });
    setEditingVenue(null);
    setShowForm(false);
  };

  const handleEdit = (venue: Venue) => {
    setForm({
      name: venue.name,
      description: venue.description || '',
      capacity: venue.capacity?.toString() || '',
      fullAddress: venue.fullAddress || '',
      imageUrl: venue.images?.[0] || '',
      atmosphere: venue.atmosphere?.join(', ') || '',
    });
    setEditingVenue(venue);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        fullAddress: form.fullAddress || null,
        images: form.imageUrl ? [form.imageUrl] : [],
        atmosphere: form.atmosphere
          ? form.atmosphere.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const url = editingVenue
        ? `/api/admin/venues/${editingVenue.id}`
        : '/api/admin/venues';
      const method = editingVenue ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save venue');
      }

      await fetchVenues();
      resetForm();
    } catch (err) {
      console.error('Failed to save venue:', err);
      alert('Failed to save venue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cityList = Array.from(new Set(venues.map(v => extractCity(v.fullAddress)))).sort();
  
  const filteredVenues = selectedCity 
    ? venues.filter(v => extractCity(v.fullAddress) === selectedCity)
    : venues;
  
  const sortedVenues = [...filteredVenues].sort((a, b) => {
    const cityA = extractCity(a.fullAddress);
    const cityB = extractCity(b.fullAddress);
    return cityA.localeCompare(cityB);
  });

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading venues...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-culinary">Manage Venues</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent text-culinary px-6 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          + Add Venue
        </button>
      </div>

      {cityList.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCity(null)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedCity === null 
                ? 'bg-accent text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Cities ({venues.length})
          </button>
          {cityList.map(city => {
            const count = venues.filter(v => extractCity(v.fullAddress) === city).length;
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  selectedCity === city 
                    ? 'bg-accent text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {city} ({count})
              </button>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">
            {editingVenue ? 'Edit Venue' : 'New Venue'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={form.fullAddress}
                  onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
                  placeholder="Full address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atmosphere Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.atmosphere}
                  onChange={(e) => setForm({ ...form, atmosphere: e.target.value })}
                  placeholder="e.g., Intimate, Industrial, Rooftop"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploader
                  currentImage={form.imageUrl}
                  onImageUploaded={(url) => setForm({ ...form, imageUrl: url })}
                  label="Venue Image"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-culinary text-white px-6 py-2 rounded-lg font-medium hover:bg-culinary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingVenue ? 'Update Venue' : 'Create Venue'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedVenues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {venues.length === 0 ? 'No venues yet. Add your first venue above.' : 'No venues in this city.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {sortedVenues.map((venue) => (
              <div
                key={venue.id}
                className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
              >
                {venue.images?.[0] ? (
                  <img
                    src={venue.images[0]}
                    alt={venue.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-4xl">
                    🏠
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-bold text-culinary">{venue.name}</h4>
                    <span className="px-2 py-0.5 bg-culinary/10 text-culinary text-xs rounded-full whitespace-nowrap">
                      {extractCity(venue.fullAddress)}
                    </span>
                  </div>
                  {venue.capacity && (
                    <p className="text-sm text-gray-500">Capacity: {venue.capacity}</p>
                  )}
                  {venue.fullAddress && (
                    <p className="text-sm text-gray-500 truncate">{venue.fullAddress}</p>
                  )}
                  {venue.atmosphere && venue.atmosphere.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {venue.atmosphere.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleEdit(venue)}
                    className="mt-3 text-accent hover:underline text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
