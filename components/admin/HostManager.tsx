import React, { useState, useEffect } from 'react';
import { ImageUploader } from './ImageUploader';

interface Host {
  id: string;
  name: string;
  bio?: string | null;
  specialty?: string | null;
  role?: string | null;
  roleTitle?: string | null;
  region?: string | null;
  verified?: boolean | null;
  socialLinks?: { instagram?: string; website?: string; twitter?: string } | null;
  imageUrl?: string | null;
  pastEventsCount?: number | null;
  slug?: string | null;
  publishedAt?: string | null;
}

const ROLE_OPTIONS = [
  { value: 'sommelier', label: 'Sommelier' },
  { value: 'mixologist', label: 'Mixologist' },
  { value: 'whisky_ambassador', label: 'Whisky Ambassador' },
  { value: 'wine_director', label: 'Wine Director' },
  { value: 'beverage_director', label: 'Beverage Director' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'other', label: 'Other' },
];

export const HostManager: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    bio: '',
    specialty: '',
    role: 'other',
    roleTitle: '',
    region: '',
    imageUrl: '',
    instagram: '',
    website: '',
    slug: '',
    published: false,
  });

  useEffect(() => {
    fetchHosts();
  }, []);

  const fetchHosts = async () => {
    try {
      const response = await fetch('/api/admin/hosts');
      const data = await response.json();
      setHosts(data);
    } catch (err) {
      console.error('Failed to fetch hosts:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      bio: '',
      specialty: '',
      role: 'other',
      roleTitle: '',
      region: '',
      imageUrl: '',
      instagram: '',
      website: '',
      slug: '',
      published: false,
    });
    setEditingHost(null);
    setShowForm(false);
  };

  const handleEdit = (host: Host) => {
    setForm({
      name: host.name,
      bio: host.bio || '',
      specialty: host.specialty || '',
      role: host.role || 'other',
      roleTitle: host.roleTitle || '',
      region: host.region || '',
      imageUrl: host.imageUrl || '',
      instagram: host.socialLinks?.instagram || '',
      website: host.socialLinks?.website || '',
      slug: host.slug || '',
      published: !!host.publishedAt,
    });
    setEditingHost(host);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const wasPublished = editingHost?.publishedAt ? true : false;
      let publishedAt: string | null = null;
      
      if (form.published) {
        publishedAt = wasPublished ? editingHost.publishedAt! : new Date().toISOString();
      }
      
      const payload = {
        name: form.name,
        bio: form.bio || null,
        specialty: form.specialty || null,
        role: form.role,
        roleTitle: form.roleTitle || null,
        region: form.region || null,
        imageUrl: form.imageUrl || null,
        socialLinks: {
          instagram: form.instagram || undefined,
          website: form.website || undefined,
        },
        slug: form.slug || null,
        publishedAt,
      };

      const url = editingHost
        ? `/api/admin/hosts/${editingHost.id}`
        : '/api/admin/hosts';
      const method = editingHost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save host');
      }

      await fetchHosts();
      resetForm();
    } catch (err) {
      console.error('Failed to save host:', err);
      alert('Failed to save host. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this drink specialist?')) return;

    try {
      const response = await fetch(`/api/admin/hosts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete host');
      }

      await fetchHosts();
    } catch (err) {
      console.error('Failed to delete host:', err);
      alert('Failed to delete host. Please try again.');
    }
  };

  const getRoleLabel = (role: string | null | undefined): string => {
    const found = ROLE_OPTIONS.find(r => r.value === role);
    return found ? found.label : 'Other';
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading drink specialists...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-culinary">Manage Drink Specialists</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent text-culinary px-6 py-2 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          + Add Specialist
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-4">
            {editingHost ? 'Edit Drink Specialist' : 'New Drink Specialist'}
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
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Title
                </label>
                <input
                  type="text"
                  value={form.roleTitle}
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                  placeholder="e.g., Senior Sommelier, Brand Ambassador"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty
                </label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g., Scottish Whiskies, Craft Cocktails"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="e.g., Victoria, BC"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="@username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <ImageUploader
                  currentImage={form.imageUrl}
                  onImageUploaded={(url) => setForm({ ...form, imageUrl: url })}
                  label="Profile Photo"
                />
              </div>
              <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                <h4 className="text-sm font-bold text-gray-700 mb-3">SEO & Publishing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="auto-generated-from-name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {form.slug ? `Public URL: /host/${form.slug}` : 'Leave blank to auto-generate'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) => setForm({ ...form, published: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      <span className="ms-3 text-sm font-medium text-gray-700">
                        {form.published ? 'Published' : 'Draft'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-culinary text-white px-6 py-2 rounded-lg font-medium hover:bg-culinary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingHost ? 'Update Specialist' : 'Create Specialist'}
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
        {hosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No drink specialists yet. Add your first one above.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Specialist
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Role
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
              {hosts.map((host) => (
                <tr key={host.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {host.imageUrl ? (
                        <img
                          src={host.imageUrl}
                          alt={host.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                          🍷
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-culinary">{host.name}</div>
                        {host.verified && (
                          <span className="text-xs text-accent">Verified</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {host.roleTitle || getRoleLabel(host.role)}
                  </td>
                  <td className="px-6 py-4">
                    {host.publishedAt ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Published</span>
                        {host.slug && (
                          <a href={`/host/${host.slug}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs">
                            View
                          </a>
                        )}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(host)}
                      className="text-accent hover:underline text-sm mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(host.id)}
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
