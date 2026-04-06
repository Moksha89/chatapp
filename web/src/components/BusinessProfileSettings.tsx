import { useState, useEffect } from 'react';
import {
  X, Building2, Save, Camera, BadgeCheck, Globe, MapPin,
  Clock, Mail, Phone, ExternalLink, Share2, Copy, CheckCircle2,
  AlertTriangle, ChevronRight, Star, Shield
} from 'lucide-react';
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
  'Retail & Shopping', 'Restaurant & Food', 'Healthcare & Medical',
  'Education & Training', 'Technology & IT', 'Finance & Banking',
  'Real Estate', 'Automotive', 'Beauty & Wellness', 'Travel & Tourism',
  'Professional Services', 'Entertainment & Media', 'Agriculture',
  'Construction', 'Government', 'Non-Profit', 'Other'
];

export function BusinessProfileSettings({ isOpen, onClose }: BusinessProfileSettingsProps) {
  const [profile, setProfile] = useState<Partial<BusinessProfile>>({
    businessName: '', description: '', category: '', address: '',
    businessHours: '', email: '', website: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [catalogLink, setCatalogLink] = useState('');
  const [showCatalogShare, setShowCatalogShare] = useState(false);
  const [descCharCount, setDescCharCount] = useState(0);

  useEffect(() => {
    if (isOpen) { loadProfile(); }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getBusinessProfile();
      if (data) {
        setProfile(data);
        setDescCharCount((data.description || '').length);
        // Check if business is verified (simulated)
        setIsVerified(!!data.businessName && !!data.category && !!data.address);
        setCatalogLink(`${window.location.origin}/catalog/${data.id || 'preview'}`);
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
      setIsVerified(!!profile.businessName && !!profile.category && !!profile.address);
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setCoverPhoto(reader.result as string);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(catalogLink);
    setMessage({ type: 'success', text: 'Catalog link copied!' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Cover Photo */}
        <div className="relative h-32 bg-gradient-to-r from-[#246BFD] to-[#1A56DB] rounded-t-2xl overflow-hidden">
          {coverPhoto && <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />}
          <button
            onClick={handleCoverUpload}
            className="absolute bottom-2 right-2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          {/* Profile avatar */}
          <div className="absolute -bottom-8 left-5">
            <div className="w-16 h-16 rounded-xl bg-white shadow-lg flex items-center justify-center border-2 border-white">
              <Building2 className="w-8 h-8 text-[#246BFD]" />
            </div>
          </div>
        </div>

        {/* Header with verification */}
        <div className="pt-10 px-5 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{profile.businessName || 'Business Profile'}</h2>
            {isVerified && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
                <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[10px] font-medium text-green-700">Verified</span>
              </div>
            )}
          </div>
          {profile.category && (
            <p className="text-xs text-gray-400 mt-0.5">{profile.category}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#246BFD]" />
            </div>
          ) : (
            <div className="space-y-4">
              {message && (
                <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {message.text}
                </div>
              )}

              {/* Verification banner */}
              {!isVerified && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">Get Verified</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Complete your profile (name, category, address) to get the verified badge
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Name */}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#246BFD]" /> Business Name *
                </label>
                <Input
                  value={profile.businessName || ''}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  placeholder="Your business name"
                  className="rounded-xl"
                />
              </div>

              {/* Description with char counter */}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#246BFD]" /> Description</span>
                  <span className={`text-[10px] ${descCharCount > 450 ? 'text-amber-500' : 'text-gray-400'}`}>{descCharCount}/512</span>
                </label>
                <textarea
                  value={profile.description || ''}
                  onChange={(e) => {
                    if (e.target.value.length <= 512) {
                      setProfile({ ...profile, description: e.target.value });
                      setDescCharCount(e.target.value.length);
                    }
                  }}
                  placeholder="Tell customers about your business..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none h-20 text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#246BFD]" /> Category
                </label>
                <select
                  value={profile.category || ''}
                  onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                >
                  <option value="">Select a category</option>
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#246BFD]" /> Address
                </label>
                <textarea
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Business address"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none h-14 text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]"
                />
              </div>

              {/* Business Hours */}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#246BFD]" /> Business Hours
                </label>
                <Input
                  value={profile.businessHours || ''}
                  onChange={(e) => setProfile({ ...profile, businessHours: e.target.value })}
                  placeholder="e.g., Mon-Fri 9AM-5PM, Sat 10AM-2PM"
                  className="rounded-xl"
                />
              </div>

              {/* Contact grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#246BFD]" /> Email
                  </label>
                  <Input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="email@biz.com"
                    className="rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#246BFD]" /> Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 890"
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#246BFD]" /> Website
                </label>
                <Input
                  type="url"
                  value={profile.website || ''}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://www.example.com"
                  className="rounded-xl"
                />
              </div>

              {/* Catalog Sharing */}
              <div className="border rounded-xl p-3.5">
                <button
                  onClick={() => setShowCatalogShare(!showCatalogShare)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[#246BFD]/10 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-4 h-4 text-[#246BFD]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Share Catalog Link</p>
                    <p className="text-[10px] text-gray-400">Share your product catalog via link</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showCatalogShare ? 'rotate-90' : ''}`} />
                </button>
                {showCatalogShare && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-2">
                      <Input value={catalogLink} readOnly className="flex-1 text-xs rounded-xl bg-gray-50" />
                      <Button size="sm" variant="outline" onClick={copyLink} className="rounded-xl">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(catalogLink)} className="rounded-xl">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}
