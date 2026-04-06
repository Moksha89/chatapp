import { useState, useEffect } from 'react';
import {
  X, User, Phone, Mail, FileText, Calendar, Save, Tag,
  Share2, Copy, CheckCircle2,
  Star, Shield, Bell, BellOff
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  notes?: string;
  lastContactDate?: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface ContactDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  chatId?: string;
  chatLabels?: Label[];
  onOpenLabels?: () => void;
  onContactUpdate?: () => void;
}

export function ContactDetailsPanel({
  isOpen,
  onClose,
  contact,
  chatLabels = [],
  onOpenLabels,
  onContactUpdate
}: ContactDetailsPanelProps) {
  const [editedContact, setEditedContact] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (contact) {
      setEditedContact({
        name: contact.name,
        email: contact.email || '',
        notes: contact.notes || ''
      });
      // Load favorite/mute state from localStorage
      const favorites = JSON.parse(localStorage.getItem('favoriteContacts') || '[]');
      setIsFavorite(favorites.includes(contact.id));
      const muted = JSON.parse(localStorage.getItem('mutedContacts') || '[]');
      setIsMuted(muted.includes(contact.id));
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.updateContact(contact.id, {
        name: editedContact.name,
        email: editedContact.email || undefined,
        notes: editedContact.notes || undefined
      });
      setMessage({ type: 'success', text: 'Contact updated!' });
      onContactUpdate?.();
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update contact:', error);
      setMessage({ type: 'error', text: 'Failed to update contact' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPhone = () => {
    if (contact) {
      navigator.clipboard.writeText(contact.phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareContact = async () => {
    if (!contact) return;
    const text = `${contact.name}\n${contact.phoneNumber}${contact.email ? '\n' + contact.email : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: contact.name, text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      setMessage({ type: 'success', text: 'Contact info copied!' });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const toggleFavorite = () => {
    if (!contact) return;
    const favorites = JSON.parse(localStorage.getItem('favoriteContacts') || '[]');
    const updated = isFavorite ? favorites.filter((id: string) => id !== contact.id) : [...favorites, contact.id];
    localStorage.setItem('favoriteContacts', JSON.stringify(updated));
    setIsFavorite(!isFavorite);
  };

  const toggleMute = () => {
    if (!contact) return;
    const muted = JSON.parse(localStorage.getItem('mutedContacts') || '[]');
    const updated = isMuted ? muted.filter((id: string) => id !== contact.id) : [...muted, contact.id];
    localStorage.setItem('mutedContacts', JSON.stringify(updated));
    setIsMuted(!isMuted);
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="w-80 border-l border-gray-100 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Contact Info</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile card */}
        <div className="flex flex-col items-center p-6 bg-gradient-to-b from-[#246BFD]/5 to-transparent">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-2xl font-bold">{contact.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{contact.name}</h3>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {contact.phoneNumber}
          </p>

          {/* Quick actions */}
          <div className="flex gap-3 mt-4">
            <button onClick={handleCopyPhone} className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-xl bg-[#246BFD]/10 flex items-center justify-center group-hover:bg-[#246BFD]/20 transition">
                {copied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-[#246BFD]" />}
              </div>
              <span className="text-[10px] text-gray-500">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button onClick={handleShareContact} className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-xl bg-[#246BFD]/10 flex items-center justify-center group-hover:bg-[#246BFD]/20 transition">
                <Share2 className="h-5 w-5 text-[#246BFD]" />
              </div>
              <span className="text-[10px] text-gray-500">Share</span>
            </button>
            <button onClick={toggleFavorite} className="flex flex-col items-center gap-1 group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${isFavorite ? 'bg-amber-100' : 'bg-[#246BFD]/10 group-hover:bg-[#246BFD]/20'}`}>
                <Star className={`h-5 w-5 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[#246BFD]'}`} />
              </div>
              <span className="text-[10px] text-gray-500">{isFavorite ? 'Starred' : 'Star'}</span>
            </button>
            <button onClick={toggleMute} className="flex flex-col items-center gap-1 group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${isMuted ? 'bg-red-100' : 'bg-[#246BFD]/10 group-hover:bg-[#246BFD]/20'}`}>
                {isMuted ? <BellOff className="h-5 w-5 text-red-500" /> : <Bell className="h-5 w-5 text-[#246BFD]" />}
              </div>
              <span className="text-[10px] text-gray-500">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>
          </div>
        </div>

        {message && (
          <div className={`mx-4 p-2.5 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Labels */}
        {chatLabels.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#246BFD]" />
                Labels
              </span>
              {onOpenLabels && (
                <button onClick={onOpenLabels} className="text-[10px] text-[#246BFD] font-medium hover:underline">
                  Manage
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {chatLabels.map(label => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-full text-[10px] text-white font-medium"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Edit fields */}
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Name
            </label>
            <Input
              value={editedContact.name || ''}
              onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
              className="rounded-xl bg-[#F7F8FC] border-0 text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </label>
            <Input value={contact.phoneNumber} disabled className="bg-gray-50 rounded-xl text-sm" />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </label>
            <Input
              type="email"
              value={editedContact.email || ''}
              onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
              placeholder="Add email address"
              className="rounded-xl bg-[#F7F8FC] border-0 text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Notes
            </label>
            <textarea
              value={editedContact.notes || ''}
              onChange={(e) => setEditedContact({ ...editedContact, notes: e.target.value })}
              placeholder="Add notes about this contact..."
              className="w-full p-3 bg-[#F7F8FC] border-0 rounded-xl resize-none h-20 text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20"
            />
          </div>

          {contact.lastContactDate && (
            <div className="flex items-center gap-2 p-2.5 bg-[#F7F8FC] rounded-xl">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400">Last contact</p>
                <p className="text-xs text-gray-600 font-medium">
                  {new Date(contact.lastContactDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Encryption info */}
          <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-xl">
            <Shield className="w-4 h-4 text-green-600" />
            <p className="text-[10px] text-green-700">Messages are end-to-end encrypted</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <Button onClick={handleSave} disabled={saving} className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
