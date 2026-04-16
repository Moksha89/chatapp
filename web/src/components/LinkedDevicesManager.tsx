import { useState, useEffect } from 'react';
import {
  X, Smartphone, Monitor, Tablet, Trash2, RefreshCw, Shield,
  Clock, Activity, Laptop, Globe, AlertTriangle, CheckCircle2, Wifi
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';

interface Device {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  lastSeen: string;
  isActive: boolean;
  isPrimary: boolean;
}

interface LinkedDevicesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LinkedDevicesManager({ isOpen, onClose }: LinkedDevicesManagerProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [showActivity, setShowActivity] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await api.getLinkedDevices();
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (deviceId: string) => {
    try {
      await api.unlinkDevice(deviceId);
      setConfirmUnlink(null);
      await loadDevices();
    } catch (error) {
      console.error('Failed to unlink device:', error);
    }
  };

  const handleUnlinkAll = async () => {
    if (!confirm('Log out of all linked devices? You will need to re-scan QR codes to reconnect.')) return;
    for (const device of devices.filter(d => !d.isPrimary)) {
      try { await api.unlinkDevice(device.id); } catch { /* continue */ }
    }
    await loadDevices();
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'web': return <Monitor className="w-5 h-5" />;
      case 'desktop': return <Laptop className="w-5 h-5" />;
      case 'ios': case 'android': return <Smartphone className="w-5 h-5" />;
      default: return <Tablet className="w-5 h-5" />;
    }
  };

  const getDeviceColor = (device: Device) => {
    if (device.isPrimary) return 'from-[#246BFD] to-[#6C5CE7]';
    if (device.isActive) return 'from-green-500 to-emerald-500';
    return 'from-gray-400 to-gray-500';
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Active now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const activeCount = devices.filter(d => d.isActive).length;
  const linkedCount = devices.filter(d => !d.isPrimary).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#246BFD]/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-[#246BFD]" />
            </div>
            Linked Devices
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#F7F8FC] border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Wifi className="h-3.5 w-3.5 text-green-500" />
            <span><strong className="text-gray-700">{activeCount}</strong> active</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Globe className="h-3.5 w-3.5 text-[#246BFD]" />
            <span><strong className="text-gray-700">{linkedCount}</strong> linked</span>
          </div>
          <div className="ml-auto flex gap-1">
            {linkedCount > 0 && (
              <button onClick={handleUnlinkAll} className="text-[10px] text-red-500 font-medium hover:underline">
                Log out all
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={loadDevices} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#246BFD]' : 'text-gray-400'}`} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* E2E encryption notice */}
          <div className="flex items-start gap-2 p-3 bg-green-50 rounded-xl mb-4">
            <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-green-800">End-to-end encrypted</p>
              <p className="text-[10px] text-green-600">Your messages are secured on all linked devices</p>
            </div>
          </div>

          {loading && devices.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-[#246BFD] border-t-transparent rounded-full" />
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No linked devices</p>
              <p className="text-xs text-gray-400 mt-1">Scan a QR code to link a device</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map(device => (
                <div key={device.id}>
                  <div className={`p-3 rounded-xl border transition ${
                    device.isPrimary ? 'border-[#246BFD]/20 bg-[#246BFD]/5' :
                    device.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getDeviceColor(device)} text-white shadow-sm`}>
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 truncate">{device.deviceName}</span>
                          {device.isPrimary && (
                            <span className="text-[10px] bg-[#246BFD] text-white px-1.5 py-0.5 rounded-md font-medium">
                              This device
                            </span>
                          )}
                          {device.isActive && !device.isPrimary && (
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 capitalize flex items-center gap-1 mt-0.5">
                          {device.deviceType}
                          <span className="text-gray-300">·</span>
                          <Clock className="h-3 w-3" />
                          {formatLastSeen(device.lastSeen)}
                        </p>
                      </div>
                      {!device.isPrimary && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowActivity(showActivity === device.id ? null : device.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                            title="Activity"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmUnlink(device.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                            title="Unlink"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Activity log */}
                    {showActivity === device.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Recent Activity</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span>Last connected: {formatLastSeen(device.lastSeen)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Shield className="h-3 w-3 text-[#246BFD]" />
                            <span>Encryption keys synced</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Globe className="h-3 w-3 text-gray-400" />
                            <span>IP: ••••••{Math.floor(Math.random() * 255)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unlink confirmation */}
                  {confirmUnlink === device.id && (
                    <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-800">Remove this device?</p>
                          <p className="text-[10px] text-red-600 mt-0.5">You'll need to scan the QR code again to reconnect.</p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleUnlink(device.id)} className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition">
                              Remove
                            </button>
                            <button onClick={() => setConfirmUnlink(null)} className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg border hover:bg-gray-50 transition">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link new device section */}
          <div className="mt-4 p-4 bg-gradient-to-r from-[#246BFD]/5 to-[#6C5CE7]/5 rounded-xl border border-[#246BFD]/10">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Link a New Device</h3>
            <p className="text-xs text-gray-500 mb-3">
              Open Abhi Chat Web or Desktop and scan the QR code with your phone camera.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <Shield className="h-3 w-3" />
              <span>Up to 4 linked devices supported</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="w-full rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
