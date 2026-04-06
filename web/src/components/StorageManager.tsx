import { useState, useEffect } from 'react';
import {
  X, HardDrive, Image, FileText, Music, Trash2,
  AlertTriangle, Download, RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';

interface StorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StorageData {
  total: number;
  used: number;
  messages: number;
  media: number;
  documents: number;
  audio: number;
  other: number;
  perChat: Array<{ chatId: string; chatName: string; size: number }>;
}

const DEFAULT_STORAGE: StorageData = {
  total: 5368709120,
  used: 1073741824,
  messages: 214748365,
  media: 536870912,
  documents: 161061273,
  audio: 107374182,
  other: 53687091,
  perChat: [],
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

export function StorageManager({ isOpen, onClose }: StorageManagerProps) {
  const [storage, setStorage] = useState<StorageData>(DEFAULT_STORAGE);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [autoCleanupDays, setAutoCleanupDays] = useState(30);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Simulate loading storage data
      setTimeout(() => {
        try {
          const stored = localStorage.getItem('storageSettings');
          if (stored) {
            const s = JSON.parse(stored);
            setAutoCleanup(s.autoCleanup || false);
            setAutoCleanupDays(s.autoCleanupDays || 30);
          }
        } catch { /* defaults */ }
        setLoading(false);
      }, 500);
    }
  }, [isOpen]);

  const handleClearCategory = async (category: string) => {
    setClearing(category);
    await new Promise(r => setTimeout(r, 1000));
    setStorage(prev => ({ ...prev, [category]: 0, used: prev.used - (prev[category as keyof StorageData] as number || 0) }));
    setClearing(null);
  };

  const handleExportData = () => {
    const data = JSON.stringify({ exportDate: new Date().toISOString(), storage }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abhi-chat-storage-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveAutoCleanup = (enabled: boolean, days: number) => {
    setAutoCleanup(enabled);
    setAutoCleanupDays(days);
    localStorage.setItem('storageSettings', JSON.stringify({ autoCleanup: enabled, autoCleanupDays: days }));
  };

  if (!isOpen) return null;

  const usagePercent = (storage.used / storage.total) * 100;
  const categories = [
    { key: 'media', label: 'Photos & Videos', icon: <Image className="w-4 h-4" />, color: 'bg-blue-500', size: storage.media },
    { key: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" />, color: 'bg-green-500', size: storage.documents },
    { key: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" />, color: 'bg-purple-500', size: storage.audio },
    { key: 'messages', label: 'Messages', icon: <FileText className="w-4 h-4" />, color: 'bg-amber-500', size: storage.messages },
    { key: 'other', label: 'Other', icon: <HardDrive className="w-4 h-4" />, color: 'bg-gray-400', size: storage.other },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-[#246BFD]" />
            </div>
            Storage & Data
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-[#246BFD] border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Usage overview */}
              <div className="p-4">
                <div className="p-4 bg-gradient-to-r from-[#246BFD]/5 to-[#6C5CE7]/5 rounded-xl border border-[#246BFD]/10">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{formatSize(storage.used)}</p>
                      <p className="text-xs text-gray-500">of {formatSize(storage.total)} used</p>
                    </div>
                    <div className="w-16 h-16 relative">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#246BFD" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${usagePercent * 0.94} 94`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#246BFD]">
                        {Math.round(usagePercent)}%
                      </span>
                    </div>
                  </div>

                  {/* Color bar */}
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                    {categories.map(c => (
                      <div key={c.key} className={`${c.color} transition-all`} style={{ width: `${(c.size / storage.total) * 100}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="px-4 pb-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">By Category</p>
                {categories.map(c => (
                  <div key={c.key} className="flex items-center justify-between p-3 bg-[#F7F8FC] rounded-xl hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${c.color} bg-opacity-10 flex items-center justify-center text-gray-600`}>
                        {c.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.label}</p>
                        <p className="text-xs text-gray-400">{formatSize(c.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClearCategory(c.key)}
                      disabled={clearing === c.key || c.size === 0}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition disabled:opacity-30"
                    >
                      {clearing === c.key ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>

              <div className="h-2 bg-[#F7F8FC]" />

              {/* Auto cleanup */}
              <div className="p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Auto Cleanup</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Auto-delete old media</p>
                      <p className="text-[11px] text-gray-400">Remove media older than {autoCleanupDays} days</p>
                    </div>
                  </div>
                  <button
                    onClick={() => saveAutoCleanup(!autoCleanup, autoCleanupDays)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${autoCleanup ? 'bg-[#246BFD]' : 'bg-gray-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${autoCleanup ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {autoCleanup && (
                  <div className="ml-11 flex gap-2">
                    {[7, 14, 30, 60, 90].map(d => (
                      <button
                        key={d}
                        onClick={() => saveAutoCleanup(true, d)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition ${autoCleanupDays === d ? 'bg-[#246BFD] text-white' : 'bg-[#F7F8FC] text-gray-500 hover:bg-gray-200'}`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-2 bg-[#F7F8FC]" />

              {/* Export */}
              <div className="p-4">
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-[#F7F8FC] transition"
                >
                  <Download className="w-4 h-4" /> Export Storage Report
                </button>
              </div>
            </>
          )}
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
