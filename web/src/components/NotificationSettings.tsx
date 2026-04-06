import { useState, useEffect } from 'react';
import {
  X, Bell, Volume2, Vibrate, MessageSquare,
  Users, Radio, Phone, Moon, Clock, Check
} from 'lucide-react';
import { Button } from './ui/button';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotifSettings {
  messagePreview: boolean;
  sound: boolean;
  vibrate: boolean;
  groupNotifications: boolean;
  channelNotifications: boolean;
  callRingtone: string;
  muteSchedule: boolean;
  muteFrom: string;
  muteTo: string;
  reactionNotifications: boolean;
  mentionNotifications: boolean;
}

const DEFAULT_SETTINGS: NotifSettings = {
  messagePreview: true,
  sound: true,
  vibrate: true,
  groupNotifications: true,
  channelNotifications: true,
  callRingtone: 'default',
  muteSchedule: false,
  muteFrom: '22:00',
  muteTo: '07:00',
  reactionNotifications: true,
  mentionNotifications: true,
};

const RINGTONES = ['default', 'chime', 'ping', 'pop', 'bell', 'none'];

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('notificationSettings');
        if (stored) setSettings(JSON.parse(stored));
      } catch { /* use defaults */ }
    }
  }, [isOpen]);

  const updateSetting = <K extends keyof NotifSettings>(key: K, value: NotifSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-[#246BFD]" />
            </div>
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Message notifications */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Messages</p>

            <ToggleRow
              icon={<MessageSquare className="w-4 h-4" />}
              label="Message Preview"
              description="Show message text in notifications"
              value={settings.messagePreview}
              onChange={(v) => updateSetting('messagePreview', v)}
            />
            <ToggleRow
              icon={<Volume2 className="w-4 h-4" />}
              label="Notification Sound"
              description="Play a sound for new messages"
              value={settings.sound}
              onChange={(v) => updateSetting('sound', v)}
            />
            <ToggleRow
              icon={<Vibrate className="w-4 h-4" />}
              label="Vibrate"
              description="Vibrate on new messages"
              value={settings.vibrate}
              onChange={(v) => updateSetting('vibrate', v)}
            />
            <ToggleRow
              icon={<span className="text-lg">👍</span>}
              label="Reaction Notifications"
              description="Notify when someone reacts to your message"
              value={settings.reactionNotifications}
              onChange={(v) => updateSetting('reactionNotifications', v)}
            />
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Group & channel */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Groups & Channels</p>

            <ToggleRow
              icon={<Users className="w-4 h-4" />}
              label="Group Notifications"
              description="Get notified for group messages"
              value={settings.groupNotifications}
              onChange={(v) => updateSetting('groupNotifications', v)}
            />
            <ToggleRow
              icon={<Radio className="w-4 h-4" />}
              label="Channel Updates"
              description="Get notified for channel posts"
              value={settings.channelNotifications}
              onChange={(v) => updateSetting('channelNotifications', v)}
            />
            <ToggleRow
              icon={<span className="text-sm font-bold text-[#246BFD]">@</span>}
              label="Mention Notifications"
              description="Always notify when you're mentioned"
              value={settings.mentionNotifications}
              onChange={(v) => updateSetting('mentionNotifications', v)}
            />
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Calls */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Calls</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#246BFD]/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#246BFD]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Ringtone</p>
                  <p className="text-xs text-gray-400 capitalize">{settings.callRingtone}</p>
                </div>
              </div>
              <select
                value={settings.callRingtone}
                onChange={(e) => updateSetting('callRingtone', e.target.value)}
                className="text-xs bg-[#F7F8FC] border-0 rounded-lg px-3 py-2 text-gray-600 outline-none"
              >
                {RINGTONES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Mute schedule */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Do Not Disturb</p>

            <ToggleRow
              icon={<Moon className="w-4 h-4" />}
              label="Scheduled Mute"
              description="Automatically mute notifications during set hours"
              value={settings.muteSchedule}
              onChange={(v) => updateSetting('muteSchedule', v)}
            />

            {settings.muteSchedule && (
              <div className="ml-11 flex items-center gap-3 p-3 bg-[#F7F8FC] rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="time"
                    value={settings.muteFrom}
                    onChange={(e) => updateSetting('muteFrom', e.target.value)}
                    className="text-xs bg-white border rounded-lg px-2 py-1"
                  />
                </div>
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="time"
                  value={settings.muteTo}
                  onChange={(e) => updateSetting('muteTo', e.target.value)}
                  className="text-xs bg-white border rounded-lg px-2 py-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="w-full rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, label, description, value, onChange }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#246BFD]/10 flex items-center justify-center text-[#246BFD]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-[11px] text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
          value ? 'bg-[#246BFD]' : 'bg-gray-200'
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
