import { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface BusinessProfile {
  id: string;
  businessName: string;
  description?: string;
  category?: string;
  address?: string;
  businessHours?: string;
  email?: string;
  website?: string;
}

interface BusinessProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUSINESS_CATEGORIES = [
  'Retail',
  'Restaurant',
  'Healthcare',
  'Education',
  'Technology',
  'Finance',
  'Real Estate',
  'Automotive',
  'Beauty & Wellness',
  'Professional Services',
  'Other'
];

export function BusinessProfileSettings({ isOpen, onClose }: BusinessProfileSettingsProps) {
  const [profile, setProfile] = useState<Partial<BusinessProfile>>({
    businessName: '',
    description: '',
    category: '',
    address: '',
    businessHours: '',
    email: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getBusinessProfile();
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to load business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.businessName?.trim()) {
      setMessage({ type: 'error', text: 'Business name is required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.updateBusinessProfile({
        businessName: profile.businessName,
        description: profile.description || undefined,
        category: profile.category || undefined,
        address: profile.address || undefined,
        businessHours: profile.businessHours || undefined,
        email: profile.email || undefined,
        website: profile.website || undefined
      });
      setMessage({ type: 'success', text: 'Profile saved successfully' });
    } catch (error) {
      console.error('Failed to save business profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Profile
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <Input
                  value={profile.businessName || ''}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={profile.description || ''}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  placeholder="Tell customers about your business"
                  className="w-full p-2 border rounded-md resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={profile.category || ''}
                  onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Business address"
                  className="w-full p-2 border rounded-md resize-none h-16"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Hours
                </label>
                <Input
                  value={profile.businessHours || ''}
                  onChange={(e) => setProfile({ ...profile, businessHours: e.target.value })}
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="business@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  type="url"
                  value={profile.website || ''}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}
