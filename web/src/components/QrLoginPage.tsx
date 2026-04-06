import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, RefreshCw, Shield, Loader2, Download, MessageSquare, CheckCircle2, Clock, Settings } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

const QR_EXPIRY_SECONDS = 120;

export function QrLoginPage() {
  const { loginWithToken } = useAuth();
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanned' | 'expired' | 'error'>('loading');
  const [timeLeft, setTimeLeft] = useState<number>(QR_EXPIRY_SECONDS);
  const [totalTime, setTotalTime] = useState<number>(QR_EXPIRY_SECONDS);

  const generateQrCode = useCallback(async () => {
    setStatus('loading');
    try {
      const webDeviceId = `web-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('webDeviceId', webDeviceId);
      
      const result = await api.createQrPairingSession(webDeviceId);
      setPairingCode(result.pairingCode);
      const expiry = new Date(result.expiresAt);
      setExpiresAt(expiry);
      const total = Math.max(1, Math.floor((expiry.getTime() - Date.now()) / 1000));
      setTotalTime(total);
      setTimeLeft(total);
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

  const timerProgress = totalTime > 0 ? timeLeft / totalTime : 0;
  const timerColor = timeLeft <= 15 ? 'text-red-500' : timeLeft <= 30 ? 'text-amber-500' : 'text-[#246BFD]';

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4" style={{backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(36, 107, 253, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(108, 92, 231, 0.06) 0%, transparent 50%)'}}>
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full flex overflow-hidden border border-gray-100/50">
        <div className="flex-1 p-10 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 abhi-gradient shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">Abhi Chat Web</h1>
          <p className="text-gray-400 mb-8 text-center text-sm">
            Scan the QR code with your phone to log in
          </p>

          <div className="relative mb-6">
            {status === 'loading' && (
              <div className="w-72 h-72 bg-[#F7F8FC] rounded-2xl flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#246BFD]" />
              </div>
            )}

            {status === 'ready' && pairingCode && (
              <div className="relative">
                <div className="p-5 bg-white border-2 border-[#246BFD]/20 rounded-2xl shadow-lg shadow-blue-500/10">
                  <QRCodeSVG
                    value={qrData}
                    size={248}
                    level="H"
                    includeMargin={false}
                    fgColor="#1A1A2E"
                  />
                </div>
                {/* Circular timer overlay */}
                <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-100">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none" className={timerColor} stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerProgress)}`}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <span className={`absolute text-xs font-bold ${timerColor}`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            {status === 'scanned' && (
              <div className="w-72 h-72 bg-[#E8F5E9] rounded-2xl flex flex-col items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-3 animate-bounce" />
                <p className="text-green-800 font-bold text-lg">QR Code Scanned!</p>
                <p className="text-green-600 text-sm mt-1">Please confirm on your phone</p>
                <Loader2 className="w-5 h-5 animate-spin text-green-500 mt-3" />
              </div>
            )}

            {status === 'expired' && (
              <div className="w-72 h-72 bg-[#F7F8FC] rounded-2xl flex flex-col items-center justify-center">
                <Clock className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium mb-1">QR code expired</p>
                <p className="text-gray-400 text-sm mb-4">Click below to get a new one</p>
                <Button onClick={generateQrCode} className="bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl px-6 shadow-md shadow-blue-500/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New Code
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="w-72 h-72 bg-red-50 rounded-2xl flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <span className="text-red-500 text-xl font-bold">!</span>
                </div>
                <p className="text-red-600 font-medium mb-1">Connection failed</p>
                <p className="text-red-400 text-sm mb-4">Please check your internet</p>
                <Button onClick={generateQrCode} className="bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl px-6 shadow-md shadow-blue-500/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>

        <div className="w-80 bg-gradient-to-br from-[#246BFD] to-[#6C5CE7] p-8 text-white flex flex-col justify-center">
          <h2 className="text-xl font-bold mb-6">How to scan</h2>
          
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold">Open Abhi Chat</p>
                <p className="text-sm text-white/70">On your phone, make sure you're logged in</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold">Go to Linked Devices</p>
                <p className="text-sm text-white/70">Settings &rarr; Linked Devices</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </div>
              <div>
                <p className="font-semibold">Scan QR Code</p>
                <p className="text-sm text-white/70">Point your camera at the screen</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <a 
              href="/version/download/android" 
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-white font-medium transition-all backdrop-blur-sm"
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
