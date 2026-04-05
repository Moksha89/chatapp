import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw, Shield, Loader2, Download } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

export function QrLoginPage() {
  const { loginWithToken } = useAuth();
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanned' | 'expired' | 'error'>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const generateQrCode = useCallback(async () => {
    setStatus('loading');
    try {
      const webDeviceId = `web-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('webDeviceId', webDeviceId);
      
      const result = await api.createQrPairingSession(webDeviceId);
      setPairingCode(result.pairingCode);
      setExpiresAt(new Date(result.expiresAt));
      setStatus('ready');
    } catch (error) {
      console.error('Failed to create QR session:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    generateQrCode();
  }, [generateQrCode]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        setStatus('expired');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (!pairingCode || status !== 'ready') return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await api.getQrPairingStatus(pairingCode);
        
        if (result.status === 'scanned') {
          setStatus('scanned');
        } else        if (result.status === 'completed' && result.tokens && result.user) {
                  clearInterval(pollInterval);
                  loginWithToken(
                    result.tokens.accessToken,
                    result.tokens.refreshToken,
                    { ...result.user, isBusiness: false }
                  );
                }else if (result.status === 'expired') {
          setStatus('expired');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to check pairing status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [pairingCode, status, loginWithToken]);

  const qrData = pairingCode ? JSON.stringify({
    type: 'chatapp-pairing',
    code: pairingCode,
    version: 1,
  }) : '';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full flex overflow-hidden">
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ChatApp Web</h1>
          <p className="text-gray-600 mb-6 text-center">
            Scan the QR code with your phone to log in
          </p>

          <div className="relative mb-6">
            {status === 'loading' && (
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            )}

            {status === 'ready' && pairingCode && (
              <div className="p-4 bg-white border-2 border-green-500 rounded-lg">
                <QRCodeSVG
                  value={qrData}
                  size={224}
                  level="M"
                  includeMargin={false}
                />
              </div>
            )}

            {status === 'scanned' && (
              <div className="w-64 h-64 bg-green-50 rounded-lg flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-2" />
                <p className="text-green-700 font-medium">Confirming...</p>
                <p className="text-green-600 text-sm">Please confirm on your phone</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                <p className="text-gray-600 mb-4">QR code expired</p>
                <Button onClick={generateQrCode} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Code
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="w-64 h-64 bg-red-50 rounded-lg flex flex-col items-center justify-center">
                <p className="text-red-600 mb-4">Failed to generate QR code</p>
                <Button onClick={generateQrCode} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>

          {status === 'ready' && timeLeft > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Code expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
          )}
        </div>

        <div className="w-80 bg-green-600 p-8 text-white flex flex-col justify-center">
          <h2 className="text-xl font-semibold mb-6">How to scan</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium">1. Open ChatApp on your phone</p>
                <p className="text-sm text-green-100">Make sure you're logged in</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">2. Go to Settings</p>
                <p className="text-sm text-green-100">Tap "Linked Devices"</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">3. Scan this QR code</p>
                <p className="text-sm text-green-100">Point your camera at the screen</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex items-center gap-2 text-sm mb-4">
              <Shield className="w-4 h-4" />
              <span>Secure messaging</span>
            </div>
            
            <a 
              href="/version/download/android" 
              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Android App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
