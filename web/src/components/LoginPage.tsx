'use client';

import { useState } from 'react';
import { Phone, ArrowRight, Shield, MessageCircle } from 'lucide-react';
import api from '@/lib/api';

interface LoginPageProps {
  onLogin: (user: any, token: string, refreshToken: string) => void;
}

const COUNTRIES = [
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', dial: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dial: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'JP', dial: '+81', name: 'Japan', flag: '🇯🇵' },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [fullPhone, setFullPhone] = useState('');
  const [storedOtp, setStoredOtp] = useState('');

  const handleSendOtp = async () => {
    const phone = `${country.dial}${phoneNumber.replace(/\D/g, '')}`;
    if (phoneNumber.length < 6) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.sendOtp(phone);
      setFullPhone(phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api.verifyOtp(fullPhone, code);
      setStoredOtp(code);

      if (result.user.isNewUser || !result.user.displayName || result.user.displayName === result.user.phone) {
        setStep('name');
      } else {
        onLogin(result.user, result.token, result.refreshToken);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api.register(fullPhone, storedOtp, displayName.trim());
      onLogin(result.user, result.token, result.refreshToken);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Abhi Chat</h1>
          <p className="text-blue-100 mt-1">Stay Connected, Stay Chatting</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {step === 'phone' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Welcome</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your phone number to get started</p>

              {/* Country Picker */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-primary transition-colors"
                >
                  <span className="text-2xl">{country.flag}</span>
                  <span className="text-gray-800 font-medium">{country.name}</span>
                  <span className="text-gray-500 ml-auto">{country.dial}</span>
                </button>

                {showCountryPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => { setCountry(c); setShowCountryPicker(false); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-xl">{c.flag}</span>
                        <span className="text-gray-800">{c.name}</span>
                        <span className="text-gray-500 ml-auto text-sm">{c.dial}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Input */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 min-w-fit">
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-gray-600 font-medium">{country.dial}</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone number"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-800"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                />
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={loading || !phoneNumber}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <div className="flex items-center gap-2 mt-6 justify-center text-xs text-gray-400">
                <Shield className="w-3 h-3" />
                <span>End-to-end encrypted</span>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Verify OTP</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter the 6-digit code sent to <span className="font-medium text-gray-700">{fullPhone}</span>
              </p>

              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-800"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.some((d) => !d)}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Verify'
                )}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="w-full text-primary text-sm mt-3 hover:underline"
              >
                Change phone number
              </button>
            </>
          )}

          {step === 'name' && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Set up your profile</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your display name</p>

              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-800 mb-4"
                autoFocus
                maxLength={50}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
              <p className="text-xs text-gray-400 mb-4 text-right">{displayName.length}/50</p>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                onClick={handleRegister}
                disabled={loading || !displayName.trim()}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Get Started'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
