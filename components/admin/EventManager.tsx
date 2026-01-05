import React, { useState, useEffect } from 'react';
import { ImageUploader } from './ImageUploader';

interface Chef {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
}

interface Event {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  price?: number | null;
  totalSeats?: number | null;
  availableSeats?: number | null;
  menuHighlights?: string[] | null;
  imageUrl?: string | null;
  chefId?: string | null;
  venueId?: string | null;
  status: 'draft' | 'published' | 'archived';
  origin: 'admin' | 'ai';
  location?: string | null;
  chef?: Chef | null;
  venue?: Venue | null;
}

export const EventManager: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [chefs, setChefs] = useState<Chef[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    date: '',
    time: '',
    price: '',
    totalSeats: '',
    availableSeats: '',
    menuHighlights: '',
    imageUrl: '',
    chefId: '',
    venueId: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    location: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, chefsRes, venuesRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/chefs'),
        fetch('/api/admin/venues'),
      ]);
      
      const [eventsData, chefsData, venuesData] = await Promise.all([
        eventsRes.json(),
        chefsRes.json(),
        venuesRes.json(),
      ]);
      
      setEvents(eventsData);
      setChefs(chefsData);
      setVenues(venuesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      category: '',
      description: '',
      date: '',
      time: '',
      price: '',
      totalSeats: '',
      availableSeats: '',
      menuHighlights: '',
      imageUrl: '',
      chefId: '',
      venueId: '',
      status: 'draft',
      location: '',
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleEdit = (event: Event) => {
    setForm({
      title: event.title,
      category: event.category || '',
      description: event.description || '',
      date: event.date || '',
      time: event.time || '',
      price: event.price?.toString() || '',
      totalSeats: event.totalSeats?.toString() || '',
      availableSeats: event.availableSeats?.toString() || '',
      menuHighlights: event.menuHighlights?.join(', ') || '',
      imageUrl: event.imageUrl || '',
      chefId: event.chefId || '',
      venueId: event.venueId || '',
      status: event.status,
      location: event.location || '',
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: form.title,
        category: form.category || null,
        description: form.description || null,
        date: form.date || null,
        time: form.time || null,
        price: form.price ? parseInt(form.price, 10) : null,
        totalSeats: form.totalSeats ? parseInt(form.totalSeats, 10) : null,
        availableSeats: form.availableSeats ? parseInt(form.availableSeats, 10) : null,
        menuHighlights: form.menuHighlights
          ? form.menuHighlights.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        imageUrl: form.imageUrl || null,
        chefId: form.chefId || null,
        venueId: form.venueId || null,
        status: form.status,
        origin: 'admin' as const,
        location: form.location || null,
      };

      const url = editingEvent
        ? `/api/admin/events/${editingEvent.id}`
        : '/api/admin/events';
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      await fetchData();
      resetForm();
    } catch (err) {
      console.error('Failed to save event:', err);
      alert('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchData();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      published: 'bg-green-100 text-green-700',
      archived: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-culinary">Manage Events</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent text-culinary px-6 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          + Add Event
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">
            {editingEvent ? 'Edit Event' : 'New Event'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">Select category</option>
                  <option value="Chef's Table">Chef's Table</option>
                  <option value="Pop-up">Pop-up</option>
                  <option value="Secret Location">Secret Location</option>
                  <option value="Wine Pairing">Wine Pairing</option>
                  <option value="Tasting Menu">Tasting Menu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g., Victoria, BC"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  placeholder="e.g., March 15, 2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="text"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  placeholder="e.g., 7:00 PM"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Seats
                </label>
                <input
                  type="number"
                  value={form.totalSeats}
                  onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Seats
                </label>
                <input
                  type="number"
                  value={form.availableSeats}
                  onChange={(e) => setForm({ ...form, availableSeats: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chef
                </label>
                <select
                  value={form.chefId}
                  onChange={(e) => setForm({ ...form, chefId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">No chef assigned</option>
                  {chefs.map((chef) => (
                    <option key={chef.id} value={chef.id}>
                      {chef.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue
                </label>
                <select
                  value={form.venueId}
                  onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">No venue assigned</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as 'draft' | 'published' | 'archived' })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
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
                  Menu Highlights (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.menuHighlights}
                  onChange={(e) => setForm({ ...form, menuHighlights: e.target.value })}
                  placeholder="e.g., Truffle risotto, Wagyu beef, Chocolate souffle"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploader
                  currentImage={form.imageUrl}
                  onImageUploaded={(url) => setForm({ ...form, imageUrl: url })}
                  label="Event Image"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-culinary text-white px-6 py-2 rounded-lg font-medium hover:bg-culinary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
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
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No events yet. Add your first event above.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Chef
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                          📅
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-culinary">{event.title}</div>
                        <div className="text-xs text-gray-400">{event.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {event.chef?.name || '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{event.date || '—'}</td>
                  <td className="px-6 py-4">{getStatusBadge(event.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-accent hover:underline text-sm mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
