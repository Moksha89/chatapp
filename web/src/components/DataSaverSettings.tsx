import { useState, useEffect } from 'react';
import {
  X, Wifi, WifiOff, Image, Video, Phone, Download,
  BarChart3, Check, ArrowDown, ArrowUp, Zap
} from 'lucide-react';
import { Button } from './ui/button';

interface DataSaverSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DataSaverConfig {
  enabled: boolean;
  autoDownloadPhotos: boolean;
  autoDownloadVideos: boolean;
  autoDownloadDocuments: boolean;
  reducedCallQuality: boolean;
  compressUploads: boolean;
  autoEnableOnMobile: boolean;
  monthlyLimit: number;
}

const DEFAULT_CONFIG: DataSaverConfig = {
  enabled: false,
  autoDownloadPhotos: true,
  autoDownloadVideos: true,
  autoDownloadDocuments: true,
  reducedCallQuality: false,
  compressUploads: false,
  autoEnableOnMobile: false,
  monthlyLimit: 0,
};

function formatData(mb: number): string {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function DataSaverSettings({ isOpen, onClose }: DataSaverSettingsProps) {
  const [config, setConfig] = useState<DataSaverConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [stats] = useState({ sent: 245, received: 1830, saved: 420 });

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('dataSaverSettings');
        if (stored) setConfig(JSON.parse(stored));
      } catch { /* defaults */ }
    }
  }, [isOpen]);

  const updateConfig = (updates: Partial<DataSaverConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    localStorage.setItem('dataSaverSettings', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#246BFD]" />
            </div>
            Data Saver
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
          {/* Main toggle */}
          <div className="p-4">
            <div className={`p-4 rounded-xl border-2 transition ${config.enabled ? 'border-[#246BFD] bg-[#246BFD]/5' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.enabled ? 'bg-[#246BFD]' : 'bg-gray-200'}`}>
                    {config.enabled ? <WifiOff className="w-5 h-5 text-white" /> : <Wifi className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Data Saver</p>
                    <p className="text-xs text-gray-500">{config.enabled ? 'Active — saving data' : 'Off — full quality'}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateConfig({ enabled: !config.enabled })}
                  className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${config.enabled ? 'bg-[#246BFD]' : 'bg-gray-200'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${config.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Bandwidth stats */}
          <div className="px-4 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> This Month's Usage
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#F7F8FC] rounded-xl text-center">
                <ArrowUp className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-gray-900">{formatData(stats.sent)}</p>
                <p className="text-[10px] text-gray-400">Sent</p>
              </div>
              <div className="p-3 bg-[#F7F8FC] rounded-xl text-center">
                <ArrowDown className="h-4 w-4 text-green-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-gray-900">{formatData(stats.received)}</p>
                <p className="text-[10px] text-gray-400">Received</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <Zap className="h-4 w-4 text-green-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-green-700">{formatData(stats.saved)}</p>
                <p className="text-[10px] text-green-600">Saved</p>
              </div>
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Auto-download settings */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Auto-Download</p>

            <ToggleRow
              icon={<Image className="w-4 h-4" />}
              label="Auto-download Photos"
              description="Automatically download images"
              value={config.autoDownloadPhotos}
              onChange={(v) => updateConfig({ autoDownloadPhotos: v })}
            />
            <ToggleRow
              icon={<Video className="w-4 h-4" />}
              label="Auto-download Videos"
              description="Automatically download videos"
              value={config.autoDownloadVideos}
              onChange={(v) => updateConfig({ autoDownloadVideos: v })}
            />
            <ToggleRow
              icon={<Download className="w-4 h-4" />}
              label="Auto-download Documents"
              description="Automatically download files"
              value={config.autoDownloadDocuments}
              onChange={(v) => updateConfig({ autoDownloadDocuments: v })}
            />
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Quality settings */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Quality</p>

            <ToggleRow
              icon={<Phone className="w-4 h-4" />}
              label="Reduced Call Quality"
              description="Use less data during voice/video calls"
              value={config.reducedCallQuality}
              onChange={(v) => updateConfig({ reducedCallQuality: v })}
            />
            <ToggleRow
              icon={<Image className="w-4 h-4" />}
              label="Compress Uploads"
              description="Compress images before sending"
              value={config.compressUploads}
              onChange={(v) => updateConfig({ compressUploads: v })}
            />
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Smart features */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Smart Features</p>

            <ToggleRow
              icon={<Wifi className="w-4 h-4" />}
              label="Auto-enable on Mobile Data"
              description="Automatically enable data saver on cellular"
              value={config.autoEnableOnMobile}
              onChange={(v) => updateConfig({ autoEnableOnMobile: v })}
            />
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
