import { useState } from 'react';
import { QrLoginPage } from './QrLoginPage';
import { useAuth } from '../context/AuthContext';
import { Smartphone, ArrowLeft, Loader2, MessageSquare, Download } from 'lucide-react';
import { Button } from './ui/button';

type LoginMode = 'qr' | 'phone';
type PhoneStep = 'phone' | 'otp' | 'register';

export function LoginPage() {
  const { login, register, sendOtp } = useAuth();
  const [mode, setMode] = useState<LoginMode>('phone');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  if (mode === 'qr') {
    return (
      <div className="relative">
        <button
          onClick={() => setMode('phone')}
          className="absolute top-4 left-4 z-10 flex items-center gap-1 text-gray-600 hover:text-gray-800 bg-white/80 rounded-lg px-3 py-2 shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <QrLoginPage />
      </div>
    );
  }

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await sendOtp(phoneNumber);
      setPhoneStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(phoneNumber, otp);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('not found') || msg.includes('not registered') || msg.includes('User not found')) {
        setIsNewUser(true);
        setPhoneStep('register');
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await register(phoneNumber, otp, displayName, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4" style={{backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(36, 107, 253, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(108, 92, 231, 0.06) 0%, transparent 50%)'}}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 abhi-gradient shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Abhi</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to continue messaging</p>
        </div>

        {phoneStep === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Send OTP'
              )}
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-gray-400 text-center">
                Use code <strong>123456</strong> for testing
              </p>
            )}
          </div>
        )}

        {phoneStep === 'otp' && !isNewUser && (
          <div className="space-y-4">
            <button
              onClick={() => { setPhoneStep('phone'); setError(''); setOtp(''); }}
              className="flex items-center gap-1 text-sm text-[#246BFD] hover:text-[#1A56DB] font-medium"
            >
              <ArrowLeft className="w-3 h-3" />
              Change number
            </button>
            <p className="text-sm text-gray-500">
              Enter the OTP sent to <strong className="text-gray-700">{phoneNumber}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none text-center text-2xl tracking-widest transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Verify & Login'
              )}
            </Button>
          </div>
        )}

        {phoneStep === 'register' && (
          <div className="space-y-4">
            <div className="bg-[#E8F0FE] border border-[#246BFD]/20 rounded-xl p-3">
              <p className="text-sm text-[#246BFD] font-medium">
                New user! Please enter your name to create an account.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
          <button
            onClick={() => setMode('qr')}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-500 hover:text-[#246BFD] text-sm font-medium transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Login with QR code instead
          </button>
          <a
            href="/version/download/android"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#246BFD] to-[#6C5CE7] hover:from-[#1A56DB] hover:to-[#5A4BD1] text-white rounded-xl text-sm font-medium transition-all shadow-md shadow-purple-500/20"
          >
            <Download className="w-4 h-4" />
            Download Android App
          </a>
        </div>
      </div>
    </div>
  );
}
