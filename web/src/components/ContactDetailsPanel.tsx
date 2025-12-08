import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, FileText, Calendar, Save, Tag } from 'lucide-react';
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

  useEffect(() => {
    if (contact) {
      setEditedContact({
        name: contact.name,
        email: contact.email || '',
        notes: contact.notes || ''
      });
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
      setMessage({ type: 'success', text: 'Contact updated successfully' });
      onContactUpdate?.();
    } catch (error) {
      console.error('Failed to update contact:', error);
      setMessage({ type: 'error', text: 'Failed to update contact' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Contact Info</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium">{contact.name}</h3>
          <p className="text-sm text-gray-500">{contact.phoneNumber}</p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {chatLabels.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Tag className="w-4 h-4" />
                Labels
              </span>
              {onOpenLabels && (
                <button onClick={onOpenLabels} className="text-xs text-green-600 hover:underline">
                  Manage
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {chatLabels.map(label => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-4 h-4" />
              Name
            </label>
            <Input
              value={editedContact.name || ''}
              onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            <Input value={contact.phoneNumber} disabled className="bg-gray-50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <Input
              type="email"
              value={editedContact.email || ''}
              onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
              placeholder="Add email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Notes
            </label>
            <textarea
              value={editedContact.notes || ''}
              onChange={(e) => setEditedContact({ ...editedContact, notes: e.target.value })}
              placeholder="Add notes about this contact"
              className="w-full p-2 border rounded-md resize-none h-24 text-sm"
            />
          </div>

          {contact.lastContactDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Last Contact
              </label>
              <p className="text-sm text-gray-600">
                {new Date(contact.lastContactDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
