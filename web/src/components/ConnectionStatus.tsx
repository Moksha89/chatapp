import { useState, useEffect, useRef } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { socketService } from '../services/socket';

type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [showBanner, setShowBanner] = useState(false);
  const hasConnectedOnce = useRef(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Listen for socket connection state changes via event
    const unsubscribe = socketService.on('_connection', (data: unknown) => {
      const { connected } = data as { connected: boolean };
      if (connected) {
        hasConnectedOnce.current = true;
        if (disconnectTimer.current) {
          clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
        }
        setState('connected');
        setShowBanner(false);
      } else {
        // Only show banner if we had previously connected successfully
        // Use a 5-second delay to avoid flashing during brief reconnects
        if (hasConnectedOnce.current) {
          setState('connecting');
          setShowBanner(true);
          disconnectTimer.current = setTimeout(() => {
            if (!socketService.isConnected()) {
              setState('disconnected');
            }
          }, 5000);
        }
      }
    });

    // Also poll as a fallback, but with a longer interval and grace period
    const interval = setInterval(() => {
      if (socketService.isConnected()) {
        setState('connected');
        setShowBanner(false);
      } else if (hasConnectedOnce.current) {
        setState('disconnected');
        setShowBanner(true);
      }
    }, 10000);

    const handleOffline = () => {
      setState('disconnected');
      setShowBanner(true);
    };

    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleReconnect = () => {
    setState('connecting');
    const token = localStorage.getItem('accessToken');
    if (token) {
      socketService.disconnect();
      socketService.connect(token);
    }
  };

  if (!showBanner || state === 'connected') {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 flex items-center justify-center gap-3 ${
      state === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
    } text-white`}>
      {state === 'connecting' ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Reconnecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Connection lost</span>
          <button
            onClick={handleReconnect}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
          >
            Reconnect
          </button>
        </>
      )}
    </div>
  );
}
