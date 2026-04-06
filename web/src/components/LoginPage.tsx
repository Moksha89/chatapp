import { useState, useRef, useCallback } from 'react';
import { QrLoginPage } from './QrLoginPage';
import { useAuth } from '../context/AuthContext';
import { Smartphone, ArrowLeft, Loader2, MessageSquare, Download, Phone, Lock, Camera, ChevronDown, Search, User } from 'lucide-react';
import { Button } from './ui/button';

type LoginMode = 'qr' | 'phone';
type PhoneStep = 'phone' | 'otp' | 'register';

interface CountryInfo {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: CountryInfo[] = [
  { name: 'India', code: 'IN', dialCode: '+91', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '\uD83C\uDDE8\uD83C\uDDE6' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '\uD83C\uDDE6\uD83C\uDDFA' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { name: 'Russia', code: 'RU', dialCode: '+7', flag: '\uD83C\uDDF7\uD83C\uDDFA' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '\uD83C\uDDEE\uD83C\uDDE9' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '\uD83C\uDDF9\uD83C\uDDF7' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '\uD83C\uDDE6\uD83C\uDDEA' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '\uD83C\uDDF8\uD83C\uDDEC' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '\uD83C\uDDF2\uD83C\uDDFE' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '\uD83C\uDDF9\uD83C\uDDED' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '\uD83C\uDDF5\uD83C\uDDED' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '\uD83C\uDDF3\uD83C\uDDEC' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '\uD83C\uDDFF\uD83C\uDDE6' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '\uD83C\uDDEA\uD83C\uDDEC' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '\uD83C\uDDF5\uD83C\uDDF0' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '\uD83C\uDDE7\uD83C\uDDE9' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '\uD83C\uDDF1\uD83C\uDDF0' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '\uD83C\uDDF3\uD83C\uDDF5' },
];

export function LoginPage() {
  const { login, register, sendOtp } = useAuth();
  const [mode, setMode] = useState<LoginMode>('phone');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [localPhone, setLocalPhone] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.dialCode.includes(countrySearch) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = otp.split('');
    while (newOtp.length < 6) newOtp.push('');
    newOtp[index] = value;
    const joined = newOtp.join('');
    setOtp(joined);
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleProfilePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProfilePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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
    if (!localPhone.trim()) {
      setError('Please enter a phone number');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the terms and conditions');
      return;
    }
    const fullPhone = selectedCountry.dialCode + localPhone;
    setPhoneNumber(fullPhone);
    setIsLoading(true);
    setError('');
    try {
      await sendOtp(fullPhone);
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
          <h1 className="text-2xl font-bold text-gray-900">Abhi Chat</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to continue messaging</p>
        </div>

        {phoneStep === 'phone' && (
          <div className="space-y-4">
            {/* Phone icon */}
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center">
                <Phone className="w-10 h-10 text-[#246BFD]" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-center text-[#1A1A2E]">Enter your mobile phone</h2>

            {/* Country picker + phone input */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCountryPicker(true)}
                className="flex items-center gap-1 px-3 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl hover:border-[#246BFD] transition-all min-w-[100px]"
              >
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-medium text-[#1A1A2E]">{selectedCountry.dialCode}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              <input
                type="tel"
                autoComplete="tel"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Phone number"
                className="flex-1 px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#246BFD] focus:ring-[#246BFD]"
              />
              <span className="text-sm text-gray-500">I accept to Conditions</span>
            </label>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleSendOtp}
              disabled={isLoading || !localPhone.trim() || !acceptedTerms}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Send OTP'
              )}
            </Button>
          </div>
        )}

        {/* Country picker modal */}
        {showCountryPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold mb-3">Select Country</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code + country.dialCode}
                    onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); setCountrySearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition-colors border-b border-gray-50"
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 text-left text-sm text-[#1A1A2E]">{country.name}</span>
                    <span className="text-sm text-gray-400 font-medium">{country.dialCode}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t">
                <button
                  onClick={() => { setShowCountryPicker(false); setCountrySearch(''); }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {phoneStep === 'otp' && !isNewUser && (
          <div className="space-y-4">
            {/* Lock icon */}
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center">
                <Lock className="w-10 h-10 text-[#246BFD]" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-center text-[#1A1A2E]">Enter OTP Code</h2>
            <p className="text-sm text-gray-500 text-center">
              Code sent to <strong className="text-gray-700">{phoneNumber}</strong>
            </p>

            {/* 6 OTP boxes */}
            <div className="flex gap-2 justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { otpInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i] || ''}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold bg-[#F7F8FC] border rounded-xl outline-none transition-all ${
                    otp[i] ? 'border-[#246BFD]/50 text-[#1A1A2E]' : 'border-gray-200'
                  } focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]`}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="text-center text-sm">
              <span className="text-gray-500">Didn't receive code? </span>
              <button
                onClick={() => { setError(''); sendOtp(phoneNumber).catch(() => {}); }}
                className="text-[#246BFD] font-semibold hover:underline"
              >
                Resend
              </button>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.length < 6}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Verify'
              )}
            </Button>

            <button
              onClick={() => { setPhoneStep('phone'); setError(''); setOtp(''); }}
              className="w-full text-center text-sm text-[#246BFD] hover:text-[#1A56DB] font-medium"
            >
              Change Phone Number
            </button>
          </div>
        )}

        {phoneStep === 'register' && (
          <div className="space-y-4">
            {/* Profile photo picker */}
            <div className="flex flex-col items-center mb-2">
              <button
                onClick={handleProfilePhoto}
                className="w-24 h-24 rounded-full bg-[#E8F0FE] flex items-center justify-center hover:bg-[#D6E4FD] transition-colors relative overflow-hidden"
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-10 h-10 text-[#246BFD]" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button onClick={handleProfilePhoto} className="text-sm text-[#246BFD] font-medium mt-2 hover:underline">
                Add Profile Photo
              </button>
            </div>

            <h2 className="text-lg font-bold text-center text-[#1A1A2E]">Enter your name</h2>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#246BFD]" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleRegister}
              disabled={isLoading || !displayName.trim()}
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
