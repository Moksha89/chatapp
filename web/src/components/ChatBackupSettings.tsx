import { useState, useEffect } from 'react';
import {
  X, Cloud, CloudOff, Shield, Clock, Download, Upload,
  AlertTriangle, RefreshCw, Lock, HardDrive, Trash2
} from 'lucide-react';
import { Button } from './ui/button';

interface ChatBackupSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BackupConfig {
  autoBackup: boolean;
  frequency: string;
  includeMedia: boolean;
  encrypted: boolean;
  cloudProvider: string;
  lastBackup: string | null;
}

interface BackupEntry {
  id: string;
  date: string;
  size: number;
  includeMedia: boolean;
  encrypted: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

export function ChatBackupSettings({ isOpen, onClose }: ChatBackupSettingsProps) {
  const [config, setConfig] = useState<BackupConfig>({
    autoBackup: false,
    frequency: 'weekly',
    includeMedia: false,
    encrypted: true,
    cloudProvider: 'local',
    lastBackup: null,
  });
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backing, setBacking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('backupSettings');
        if (stored) setConfig(JSON.parse(stored));
        const storedBackups = localStorage.getItem('backupHistory');
        if (storedBackups) setBackups(JSON.parse(storedBackups));
      } catch { /* defaults */ }
    }
  }, [isOpen]);

  const updateConfig = (updates: Partial<BackupConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    localStorage.setItem('backupSettings', JSON.stringify(updated));
  };

  const handleBackupNow = async () => {
    setBacking(true);
    setProgress(0);
    // Simulate backup progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(i);
    }
    const newBackup: BackupEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      size: config.includeMedia ? 524288000 : 52428800,
      includeMedia: config.includeMedia,
      encrypted: config.encrypted,
    };
    const updated = [newBackup, ...backups].slice(0, 10);
    setBackups(updated);
    localStorage.setItem('backupHistory', JSON.stringify(updated));
    updateConfig({ lastBackup: newBackup.date });
    setBacking(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRestore = async (_backupId: string) => {
    if (!confirm('Restore from this backup? Current messages will be replaced.')) return;
    setRestoring(true);
    await new Promise(r => setTimeout(r, 3000));
    setRestoring(false);
  };

  const handleDeleteBackup = (backupId: string) => {
    const updated = backups.filter(b => b.id !== backupId);
    setBackups(updated);
    localStorage.setItem('backupHistory', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-[#246BFD]" />
            </div>
            Chat Backup
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Backup now */}
          <div className="p-4">
            <div className="p-4 bg-gradient-to-r from-[#246BFD]/5 to-[#6C5CE7]/5 rounded-xl border border-[#246BFD]/10">
              {backing ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="h-5 w-5 text-[#246BFD] animate-spin" />
                    <span className="font-medium text-gray-900">Backing up...</span>
                    <span className="text-xs text-gray-500 ml-auto">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#246BFD] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {progress < 30 ? 'Collecting messages...' : progress < 70 ? 'Encrypting data...' : 'Finalizing backup...'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">Backup Your Chats</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {config.lastBackup
                          ? `Last backup: ${new Date(config.lastBackup).toLocaleDateString()}`
                          : 'No backup yet'}
                      </p>
                    </div>
                    {config.encrypted && (
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleBackupNow}
                    className="w-full py-2.5 bg-[#246BFD] text-white rounded-xl text-sm font-medium hover:bg-[#1A56DB] transition flex items-center justify-center gap-2"
                  >
                    <Upload className="h-4 w-4" /> Back Up Now
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Backup settings */}
          <div className="p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Settings</p>

            {/* Auto backup toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#246BFD]/10 flex items-center justify-center text-[#246BFD]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Scheduled Backup</p>
                  <p className="text-[11px] text-gray-400">Automatically back up on schedule</p>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ autoBackup: !config.autoBackup })}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${config.autoBackup ? 'bg-[#246BFD]' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.autoBackup ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Frequency selector */}
            {config.autoBackup && (
              <div className="ml-11 flex gap-2">
                {['daily', 'weekly', 'monthly'].map(freq => (
                  <button
                    key={freq}
                    onClick={() => updateConfig({ frequency: freq })}
                    className={`px-3 py-1.5 text-xs rounded-lg capitalize transition ${
                      config.frequency === freq ? 'bg-[#246BFD] text-white' : 'bg-[#F7F8FC] text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            )}

            {/* Include media */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#246BFD]/10 flex items-center justify-center text-[#246BFD]">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Include Media</p>
                  <p className="text-[11px] text-gray-400">Back up photos, videos, and files</p>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ includeMedia: !config.includeMedia })}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${config.includeMedia ? 'bg-[#246BFD]' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.includeMedia ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Encryption */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">End-to-end Encryption</p>
                  <p className="text-[11px] text-gray-400">Encrypt your backup data</p>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ encrypted: !config.encrypted })}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${config.encrypted ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${config.encrypted ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Cloud provider */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#246BFD]/10 flex items-center justify-center text-[#246BFD]">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Storage Location</p>
                  <p className="text-[11px] text-gray-400 capitalize">{config.cloudProvider}</p>
                </div>
              </div>
              <select
                value={config.cloudProvider}
                onChange={(e) => updateConfig({ cloudProvider: e.target.value })}
                className="text-xs bg-[#F7F8FC] border-0 rounded-lg px-3 py-2 text-gray-600 outline-none"
              >
                <option value="local">Local Storage</option>
                <option value="google-drive">Google Drive</option>
                <option value="icloud">iCloud</option>
                <option value="dropbox">Dropbox</option>
              </select>
            </div>
          </div>

          <div className="h-2 bg-[#F7F8FC]" />

          {/* Backup history */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Backup History</p>
            {backups.length === 0 ? (
              <div className="py-6 text-center">
                <CloudOff className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No backups yet</p>
                <p className="text-xs text-gray-400 mt-1">Create your first backup above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map(backup => (
                  <div key={backup.id} className="flex items-center gap-3 p-3 bg-[#F7F8FC] rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <Cloud className="h-4 w-4 text-[#246BFD]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(backup.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-2">
                        <span>{formatSize(backup.size)}</span>
                        {backup.encrypted && <><Lock className="h-2.5 w-2.5" /> Encrypted</>}
                        {backup.includeMedia && <span>+ Media</span>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoring}
                        className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-[#246BFD] transition"
                        title="Restore"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="px-4 pb-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-700">
                Backups include message history{config.includeMedia ? ' and media files' : ''}. 
                {config.encrypted ? ' Data is encrypted for your security.' : ' Consider enabling encryption for security.'}
              </p>
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
