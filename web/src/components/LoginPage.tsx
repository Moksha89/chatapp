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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">WhatsApp Business</h1>
          <p className="text-gray-500 mt-1">Sign in to continue</p>
        </div>

        {phoneStep === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Send OTP'
              )}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              Use code <strong>123456</strong> for testing
            </p>
          </div>
        )}

        {phoneStep === 'otp' && !isNewUser && (
          <div className="space-y-4">
            <button
              onClick={() => { setPhoneStep('phone'); setError(''); setOtp(''); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-3 h-3" />
              Change number
            </button>
            <p className="text-sm text-gray-600">
              Enter the OTP sent to <strong>{phoneNumber}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                New user! Please enter your name to create an account.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
          <button
            onClick={() => setMode('qr')}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 hover:text-[#00a884] text-sm"
          >
            <Smartphone className="w-4 h-4" />
            Login with QR code instead
          </button>
          <a
            href="/version/download/android"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Android App
          </a>
        </div>
      </div>
    </div>
  );
}
