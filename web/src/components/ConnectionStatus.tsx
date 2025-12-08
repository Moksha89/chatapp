import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { socketService } from '../services/socket';

type ConnectionState = 'connected' | 'connecting' | 'disconnected';

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      if (socketService.isConnected()) {
        setState('connected');
        setShowBanner(false);
      } else {
        setState('disconnected');
        setShowBanner(true);
      }
    };

    checkConnection();

    const interval = setInterval(checkConnection, 3000);

    const handleOnline = () => {
      setState('connecting');
    };

    const handleOffline = () => {
      setState('disconnected');
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
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
