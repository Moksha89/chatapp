import { useState, useEffect } from 'react';
import { X, Smartphone, Monitor, Tablet, Trash2, RefreshCw } from 'lucide-react';
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
    if (!confirm('Are you sure you want to unlink this device?')) return;
    
    try {
      await api.unlinkDevice(deviceId);
      await loadDevices();
    } catch (error) {
      console.error('Failed to unlink device:', error);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'web':
        return <Monitor className="w-5 h-5" />;
      case 'ios':
      case 'android':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Tablet className="w-5 h-5" />;
    }
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Linked Devices
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Devices currently linked to your account
            </p>
            <Button variant="ghost" size="sm" onClick={loadDevices} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading && devices.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : devices.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No linked devices</p>
          ) : (
            <div className="space-y-3">
              {devices.map(device => (
                <div
                  key={device.id}
                  className={`p-3 rounded-lg border ${device.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${device.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{device.deviceName}</span>
                        {device.isPrimary && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                        {device.isActive && !device.isPrimary && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{device.deviceType}</p>
                      <p className="text-xs text-gray-400">
                        Last active: {formatLastSeen(device.lastSeen)}
                      </p>
                    </div>
                    {!device.isPrimary && (
                      <button
                        onClick={() => handleUnlink(device.id)}
                        className="p-2 hover:bg-red-50 rounded text-red-500"
                        title="Unlink device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-sm mb-2">Link a new device</h3>
            <p className="text-sm text-gray-600">
              To link a new device, open ChatApp Web on that device and scan the QR code with your phone.
            </p>
          </div>
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
