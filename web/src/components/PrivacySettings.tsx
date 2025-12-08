import { useState, useEffect } from 'react';
import { X, Shield, UserX, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import { useI18n } from '../i18n/I18nContext';

interface PrivacySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BlockedUser {
  id: string;
  displayName: string;
}

export function PrivacySettings({ isOpen, onClose }: PrivacySettingsProps) {
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [privacyData, blockedIds] = await Promise.all([
        api.getPrivacySettings(),
        api.getBlockedUsers(),
      ]);
      
      setReadReceiptsEnabled(privacyData.readReceiptsEnabled);
      
      // Load blocked user details
      const blockedUserDetails: BlockedUser[] = [];
      for (const userId of blockedIds) {
        try {
          const users = await api.searchUsers(userId);
          const user = users.find(u => u.id === userId);
          if (user) {
            blockedUserDetails.push({ id: user.id, displayName: user.displayName });
          } else {
            blockedUserDetails.push({ id: userId, displayName: 'Unknown User' });
          }
        } catch {
          blockedUserDetails.push({ id: userId, displayName: 'Unknown User' });
        }
      }
      setBlockedUsers(blockedUserDetails);
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReadReceipts = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const newValue = !readReceiptsEnabled;
      await api.updatePrivacySettings({ readReceiptsEnabled: newValue });
      setReadReceiptsEnabled(newValue);
      setMessage({ type: 'success', text: newValue ? 'Read receipts enabled' : 'Read receipts disabled' });
    } catch (error) {
      console.error('Failed to update read receipts:', error);
      setMessage({ type: 'error', text: 'Failed to update setting' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.unblockUser(userId);
      setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
      setMessage({ type: 'success', text: 'User unblocked' });
    } catch (error) {
      console.error('Failed to unblock user:', error);
      setMessage({ type: 'error', text: 'Failed to unblock user' });
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await api.updatePrivacySettings({ language: newLanguage });
      setLanguage(newLanguage);
      setMessage({ type: 'success', text: 'Language updated' });
    } catch (error) {
      console.error('Failed to update language:', error);
      setMessage({ type: 'error', text: 'Failed to update language' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
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
            <div className="space-y-6">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              {/* Read Receipts Toggle */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Read Receipts</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      When disabled, others won't see when you've read their messages. You also won't see when they've read yours.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleReadReceipts}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      readReceiptsEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        readReceiptsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Language</h3>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  {availableLanguages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Blocked Users */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserX className="w-5 h-5" />
                  <h3 className="font-medium">Blocked Users</h3>
                </div>
                
                {blockedUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No blocked users</p>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{user.displayName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblockUser(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-400 mt-3">
                  Blocked users cannot send you messages or call you. To block a user, open their chat and use the contact menu.
                </p>
              </div>

              {/* Privacy Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">About Privacy</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>Your messages are end-to-end encrypted</li>
                  <li>Only you and the recipient can read your messages</li>
                  <li>Blocked users cannot contact you in any way</li>
                  <li>Your privacy settings are synced across all devices</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
