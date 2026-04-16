import { useState, useEffect } from 'react';
import {
  X, Download, RefreshCw, Check, Clock, FileText,
  Shield, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { Button } from './ui/button';

interface AutoUpdateSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UpdateConfig {
  autoUpdate: boolean;
  updateOnWifiOnly: boolean;
  showChangelog: boolean;
  betaUpdates: boolean;
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  type: 'major' | 'minor' | 'patch';
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.1.0',
    date: '2026-04-01',
    type: 'minor',
    changes: [
      'Added WhatsApp Business features (labels, quick replies, catalog)',
      'Enhanced dark mode with AMOLED black option',
      'New chat themes and wallpaper options',
      'Improved call quality and reliability',
      'Data saver mode with granular controls',
    ],
  },
  {
    version: '2.0.5',
    date: '2026-03-15',
    type: 'patch',
    changes: [
      'Fixed message delivery status not updating',
      'Improved group notification settings',
      'Bug fix for disappearing messages timer',
      'Performance improvements for large chat lists',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-03-01',
    type: 'major',
    changes: [
      'Complete UI redesign with modern design system',
      'End-to-end encryption for all messages',
      'Voice and video calling support',
      'Group and channel creation',
      'Multi-device support with QR code linking',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-02-01',
    type: 'minor',
    changes: [
      'Added friend management system',
      'Contact sync improvements',
      'New emoji picker',
      'Read receipts and typing indicators',
    ],
  },
];

export function AutoUpdateSettings({ isOpen, onClose }: AutoUpdateSettingsProps) {
  const [config, setConfig] = useState<UpdateConfig>({
    autoUpdate: true,
    updateOnWifiOnly: true,
    showChangelog: true,
    betaUpdates: false,
  });
  const [expandedVersion, setExpandedVersion] = useState<string | null>(CHANGELOG[0].version);
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('autoUpdateSettings');
        if (stored) setConfig(JSON.parse(stored));
      } catch { /* defaults */ }
    }
  }, [isOpen]);

  const updateConfig = (updates: Partial<UpdateConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    localStorage.setItem('autoUpdateSettings', JSON.stringify(updated));
  };

  const checkForUpdates = async () => {
    setChecking(true);
    await new Promise(r => setTimeout(r, 2000));
    setChecking(false);
    setUpdateAvailable(false);
  };

  if (!isOpen) return null;

  const currentVersion = CHANGELOG[0].version;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <Download className="w-4 h-4 text-[#246BFD]" />
            </div>
            App Updates
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Current version */}
          <div className="p-4">
            <div className="p-4 bg-gradient-to-r from-[#246BFD]/5 to-[#6C5CE7]/5 rounded-xl border border-[#246BFD]/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">Current Version</p>
                  <p className="text-2xl font-bold text-gray-900">v{currentVersion}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <button
                onClick={checkForUpdates}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#246BFD] text-white rounded-xl text-sm font-medium hover:bg-[#1A56DB] disabled:opacity-50 transition"
              >
                {checking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Checking...
                  </>
                ) : updateAvailable ? (
                  <>
                    <Download className="h-4 w-4" /> Update Available
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Check for Updates
                  </>
                )}
              </button>
              {!checking && !updateAvailable && (
                <p className="text-[10px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <Check className="h-3 w-3 text-green-500" /> You're up to date
                </p>
              )}
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Update settings */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Update Settings</p>

            <ToggleRow
              icon={<Download className="w-4 h-4" />}
              label="Auto-update"
              description="Automatically install updates"
              value={config.autoUpdate}
              onChange={(v) => updateConfig({ autoUpdate: v })}
            />
            <ToggleRow
              icon={<Shield className="w-4 h-4" />}
              label="Wi-Fi Only"
              description="Only download updates on Wi-Fi"
              value={config.updateOnWifiOnly}
              onChange={(v) => updateConfig({ updateOnWifiOnly: v })}
            />
            <ToggleRow
              icon={<FileText className="w-4 h-4" />}
              label="Show Changelog"
              description="Show what's new after updates"
              value={config.showChangelog}
              onChange={(v) => updateConfig({ showChangelog: v })}
            />
            <ToggleRow
              icon={<Sparkles className="w-4 h-4" />}
              label="Beta Updates"
              description="Get early access to new features"
              value={config.betaUpdates}
              onChange={(v) => updateConfig({ betaUpdates: v })}
            />
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Changelog */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Changelog
            </p>
            <div className="space-y-2">
              {CHANGELOG.map(entry => (
                <div key={entry.version} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedVersion(expandedVersion === entry.version ? null : entry.version)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#F7F8FC] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        entry.type === 'major' ? 'bg-[#246BFD]' : entry.type === 'minor' ? 'bg-green-500' : 'bg-amber-500'
                      }`} />
                      <span className="font-medium text-sm text-gray-900">v{entry.version}</span>
                      <span className="text-[10px] text-gray-400">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {expandedVersion === entry.version ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {expandedVersion === entry.version && (
                    <div className="px-3 pb-3 border-t border-gray-50">
                      <ul className="space-y-1.5 mt-2">
                        {entry.changes.map((change, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
        className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${value ? 'bg-[#246BFD]' : 'bg-gray-200'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
