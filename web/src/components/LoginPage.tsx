import { useState, useRef, useCallback, useEffect } from 'react';
import { QrLoginPage } from './QrLoginPage';
import { useAuth } from '../context/AuthContext';
import { Smartphone, ArrowLeft, Loader2, MessageSquare, Download, Phone, Lock, Camera, ChevronDown, Search, User, Check, Shield, Clock } from 'lucide-react';
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
  { name: 'Afghanistan', code: 'AF', dialCode: '+93', flag: '🇦🇫' },
  { name: 'Albania', code: 'AL', dialCode: '+355', flag: '🇦🇱' },
  { name: 'Algeria', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Andorra', code: 'AD', dialCode: '+376', flag: '🇦🇩' },
  { name: 'Angola', code: 'AO', dialCode: '+244', flag: '🇦🇴' },
  { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Armenia', code: 'AM', dialCode: '+374', flag: '🇦🇲' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Austria', code: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', code: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Bahamas', code: 'BS', dialCode: '+1242', flag: '🇧🇸' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Barbados', code: 'BB', dialCode: '+1246', flag: '🇧🇧' },
  { name: 'Belarus', code: 'BY', dialCode: '+375', flag: '🇧🇾' },
  { name: 'Belgium', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Belize', code: 'BZ', dialCode: '+501', flag: '🇧🇿' },
  { name: 'Benin', code: 'BJ', dialCode: '+229', flag: '🇧🇯' },
  { name: 'Bhutan', code: 'BT', dialCode: '+975', flag: '🇧🇹' },
  { name: 'Bolivia', code: 'BO', dialCode: '+591', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', code: 'BA', dialCode: '+387', flag: '🇧🇦' },
  { name: 'Botswana', code: 'BW', dialCode: '+267', flag: '🇧🇼' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Brunei', code: 'BN', dialCode: '+673', flag: '🇧🇳' },
  { name: 'Bulgaria', code: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫' },
  { name: 'Burundi', code: 'BI', dialCode: '+257', flag: '🇧🇮' },
  { name: 'Cambodia', code: 'KH', dialCode: '+855', flag: '🇰🇭' },
  { name: 'Cameroon', code: 'CM', dialCode: '+237', flag: '🇨🇲' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Cape Verde', code: 'CV', dialCode: '+238', flag: '🇨🇻' },
  { name: 'Central African Republic', code: 'CF', dialCode: '+236', flag: '🇨🇫' },
  { name: 'Chad', code: 'TD', dialCode: '+235', flag: '🇹🇩' },
  { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
  { name: 'China', code: 'CN', dialCode: '+86', flag: '🇨🇳' },
  { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Comoros', code: 'KM', dialCode: '+269', flag: '🇰🇲' },
  { name: 'Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬' },
  { name: 'Costa Rica', code: 'CR', dialCode: '+506', flag: '🇨🇷' },
  { name: 'Croatia', code: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { name: 'Cuba', code: 'CU', dialCode: '+53', flag: '🇨🇺' },
  { name: 'Cyprus', code: 'CY', dialCode: '+357', flag: '🇨🇾' },
  { name: 'Czech Republic', code: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { name: 'Denmark', code: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Djibouti', code: 'DJ', dialCode: '+253', flag: '🇩🇯' },
  { name: 'Dominican Republic', code: 'DO', dialCode: '+1809', flag: '🇩🇴' },
  { name: 'DR Congo', code: 'CD', dialCode: '+243', flag: '🇨🇩' },
  { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'El Salvador', code: 'SV', dialCode: '+503', flag: '🇸🇻' },
  { name: 'Equatorial Guinea', code: 'GQ', dialCode: '+240', flag: '🇬🇶' },
  { name: 'Eritrea', code: 'ER', dialCode: '+291', flag: '🇪🇷' },
  { name: 'Estonia', code: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { name: 'Eswatini', code: 'SZ', dialCode: '+268', flag: '🇸🇿' },
  { name: 'Ethiopia', code: 'ET', dialCode: '+251', flag: '🇪🇹' },
  { name: 'Fiji', code: 'FJ', dialCode: '+679', flag: '🇫🇯' },
  { name: 'Finland', code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Gabon', code: 'GA', dialCode: '+241', flag: '🇬🇦' },
  { name: 'Gambia', code: 'GM', dialCode: '+220', flag: '🇬🇲' },
  { name: 'Georgia', code: 'GE', dialCode: '+995', flag: '🇬🇪' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Greece', code: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { name: 'Guatemala', code: 'GT', dialCode: '+502', flag: '🇬🇹' },
  { name: 'Guinea', code: 'GN', dialCode: '+224', flag: '🇬🇳' },
  { name: 'Guyana', code: 'GY', dialCode: '+592', flag: '🇬🇾' },
  { name: 'Haiti', code: 'HT', dialCode: '+509', flag: '🇭🇹' },
  { name: 'Honduras', code: 'HN', dialCode: '+504', flag: '🇭🇳' },
  { name: 'Hong Kong', code: 'HK', dialCode: '+852', flag: '🇭🇰' },
  { name: 'Hungary', code: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { name: 'Iceland', code: 'IS', dialCode: '+354', flag: '🇮🇸' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Indonesia', code: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Iran', code: 'IR', dialCode: '+98', flag: '🇮🇷' },
  { name: 'Iraq', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'Ireland', code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Israel', code: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Italy', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Ivory Coast', code: 'CI', dialCode: '+225', flag: '🇨🇮' },
  { name: 'Jamaica', code: 'JM', dialCode: '+1876', flag: '🇯🇲' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
  { name: 'Jordan', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', code: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Kyrgyzstan', code: 'KG', dialCode: '+996', flag: '🇰🇬' },
  { name: 'Laos', code: 'LA', dialCode: '+856', flag: '🇱🇦' },
  { name: 'Latvia', code: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Lesotho', code: 'LS', dialCode: '+266', flag: '🇱🇸' },
  { name: 'Liberia', code: 'LR', dialCode: '+231', flag: '🇱🇷' },
  { name: 'Libya', code: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'Liechtenstein', code: 'LI', dialCode: '+423', flag: '🇱🇮' },
  { name: 'Lithuania', code: 'LT', dialCode: '+370', flag: '🇱🇹' },
  { name: 'Luxembourg', code: 'LU', dialCode: '+352', flag: '🇱🇺' },
  { name: 'Macau', code: 'MO', dialCode: '+853', flag: '🇲🇴' },
  { name: 'Madagascar', code: 'MG', dialCode: '+261', flag: '🇲🇬' },
  { name: 'Malawi', code: 'MW', dialCode: '+265', flag: '🇲🇼' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Maldives', code: 'MV', dialCode: '+960', flag: '🇲🇻' },
  { name: 'Mali', code: 'ML', dialCode: '+223', flag: '🇲🇱' },
  { name: 'Malta', code: 'MT', dialCode: '+356', flag: '🇲🇹' },
  { name: 'Mauritania', code: 'MR', dialCode: '+222', flag: '🇲🇷' },
  { name: 'Mauritius', code: 'MU', dialCode: '+230', flag: '🇲🇺' },
  { name: 'Mexico', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Moldova', code: 'MD', dialCode: '+373', flag: '🇲🇩' },
  { name: 'Monaco', code: 'MC', dialCode: '+377', flag: '🇲🇨' },
  { name: 'Mongolia', code: 'MN', dialCode: '+976', flag: '🇲🇳' },
  { name: 'Montenegro', code: 'ME', dialCode: '+382', flag: '🇲🇪' },
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Mozambique', code: 'MZ', dialCode: '+258', flag: '🇲🇿' },
  { name: 'Myanmar', code: 'MM', dialCode: '+95', flag: '🇲🇲' },
  { name: 'Namibia', code: 'NA', dialCode: '+264', flag: '🇳🇦' },
  { name: 'Nepal', code: 'NP', dialCode: '+977', flag: '🇳🇵' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'New Zealand', code: 'NZ', dialCode: '+64', flag: '🇳🇿' },
  { name: 'Nicaragua', code: 'NI', dialCode: '+505', flag: '🇳🇮' },
  { name: 'Niger', code: 'NE', dialCode: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'North Korea', code: 'KP', dialCode: '+850', flag: '🇰🇵' },
  { name: 'North Macedonia', code: 'MK', dialCode: '+389', flag: '🇲🇰' },
  { name: 'Norway', code: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { name: 'Oman', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Palestine', code: 'PS', dialCode: '+970', flag: '🇵🇸' },
  { name: 'Panama', code: 'PA', dialCode: '+507', flag: '🇵🇦' },
  { name: 'Papua New Guinea', code: 'PG', dialCode: '+675', flag: '🇵🇬' },
  { name: 'Paraguay', code: 'PY', dialCode: '+595', flag: '🇵🇾' },
  { name: 'Peru', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
  { name: 'Philippines', code: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Poland', code: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Portugal', code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Romania', code: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { name: 'Russia', code: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Rwanda', code: 'RW', dialCode: '+250', flag: '🇷🇼' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Senegal', code: 'SN', dialCode: '+221', flag: '🇸🇳' },
  { name: 'Serbia', code: 'RS', dialCode: '+381', flag: '🇷🇸' },
  { name: 'Sierra Leone', code: 'SL', dialCode: '+232', flag: '🇸🇱' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Slovakia', code: 'SK', dialCode: '+421', flag: '🇸🇰' },
  { name: 'Slovenia', code: 'SI', dialCode: '+386', flag: '🇸🇮' },
  { name: 'Solomon Islands', code: 'SB', dialCode: '+677', flag: '🇸🇧' },
  { name: 'Somalia', code: 'SO', dialCode: '+252', flag: '🇸🇴' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'South Korea', code: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { name: 'South Sudan', code: 'SS', dialCode: '+211', flag: '🇸🇸' },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Sudan', code: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'Suriname', code: 'SR', dialCode: '+597', flag: '🇸🇷' },
  { name: 'Sweden', code: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Syria', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'Taiwan', code: 'TW', dialCode: '+886', flag: '🇹🇼' },
  { name: 'Tajikistan', code: 'TJ', dialCode: '+992', flag: '🇹🇯' },
  { name: 'Tanzania', code: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Thailand', code: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Togo', code: 'TG', dialCode: '+228', flag: '🇹🇬' },
  { name: 'Tonga', code: 'TO', dialCode: '+676', flag: '🇹🇴' },
  { name: 'Trinidad and Tobago', code: 'TT', dialCode: '+1868', flag: '🇹🇹' },
  { name: 'Tunisia', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Turkey', code: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Turkmenistan', code: 'TM', dialCode: '+993', flag: '🇹🇲' },
  { name: 'Tuvalu', code: 'TV', dialCode: '+688', flag: '🇹🇻' },
  { name: 'Uganda', code: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Ukraine', code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Uruguay', code: 'UY', dialCode: '+598', flag: '🇺🇾' },
  { name: 'Uzbekistan', code: 'UZ', dialCode: '+998', flag: '🇺🇿' },
  { name: 'Vanuatu', code: 'VU', dialCode: '+678', flag: '🇻🇺' },
  { name: 'Vatican City', code: 'VA', dialCode: '+379', flag: '🇻🇦' },
  { name: 'Venezuela', code: 'VE', dialCode: '+58', flag: '🇻🇪' },
  { name: 'Vietnam', code: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Yemen', code: 'YE', dialCode: '+967', flag: '🇾🇪' },
  { name: 'Zambia', code: 'ZM', dialCode: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', code: 'ZW', dialCode: '+263', flag: '🇿🇼' },
];

const POPULAR_COUNTRY_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'AE', 'SA', 'SG'];
const RESEND_COOLDOWN = 30;

export function LoginPage() {
  const { login, register, sendOtp } = useAuth();
  const [mode, setMode] = useState<LoginMode>('phone');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone');
  const [localPhone, setLocalPhone] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES.find(c => c.code === 'IN') || COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSentCount, setOtpSentCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Auto-focus first OTP input
  useEffect(() => {
    if (phoneStep === 'otp') {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [phoneStep]);

  const sortedCountries = [...COUNTRIES].sort((a, b) => {
    const aPopular = POPULAR_COUNTRY_CODES.indexOf(a.code);
    const bPopular = POPULAR_COUNTRY_CODES.indexOf(b.code);
    if (aPopular !== -1 && bPopular !== -1) return aPopular - bPopular;
    if (aPopular !== -1) return -1;
    if (bPopular !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.dialCode.includes(countrySearch) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : sortedCountries;

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      if (digits.length > 1) {
        setOtp(digits.slice(0, 6));
        const nextIdx = Math.min(digits.length, 5);
        otpInputRefs.current[nextIdx]?.focus();
        return;
      }
      value = value.slice(-1);
    }
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

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setOtp(pasted);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
    }
  }, []);

  const handleProfilePhoto = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setProfilePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && phoneStep === 'otp' && !isNewUser && !isLoading) {
      handleVerifyOtp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

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
    if (!localPhone.trim()) { setError('Please enter a phone number'); return; }
    if (localPhone.replace(/\D/g, '').length < 4) { setError('Please enter a valid phone number'); return; }
    if (!acceptedTerms) { setError('Please accept the terms and conditions'); return; }
    const fullPhone = selectedCountry.dialCode + localPhone.replace(/\D/g, '');
    setPhoneNumber(fullPhone);
    setIsLoading(true);
    setError('');
    try {
      await sendOtp(fullPhone);
      setPhoneStep('otp');
      setResendTimer(RESEND_COOLDOWN);
      setOtpSentCount(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError('');
    try {
      await sendOtp(phoneNumber);
      setResendTimer(RESEND_COOLDOWN);
      setOtpSentCount(prev => prev + 1);
      setOtp('');
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.replace(/\D/g, '').length < 6) { setError('Please enter the complete 6-digit OTP'); return; }
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
        setOtp('');
        otpInputRefs.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) { setError('Please enter your name'); return; }
    if (displayName.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setIsLoading(true);
    setError('');
    try {
      await register(phoneNumber, otp, displayName.trim(), false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4" style={{backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(36, 107, 253, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(108, 92, 231, 0.06) 0%, transparent 50%)'}}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100/50 transition-all duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 abhi-gradient shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Abhi Chat</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to continue messaging</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['phone', 'otp', 'register'] as PhoneStep[]).map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                phoneStep === step ? 'bg-[#246BFD] text-white scale-110' :
                ['phone', 'otp', 'register'].indexOf(phoneStep) > i ? 'bg-[#246BFD] text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {['phone', 'otp', 'register'].indexOf(phoneStep) > i ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 transition-all duration-300 ${['phone', 'otp', 'register'].indexOf(phoneStep) > i ? 'bg-[#246BFD]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {phoneStep === 'phone' && (
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center">
                <Phone className="w-10 h-10 text-[#246BFD]" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-center text-[#1A1A2E]">Enter your phone number</h2>
            <p className="text-sm text-gray-400 text-center">We'll send you a verification code via SMS</p>

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
                onChange={(e) => setLocalPhone(e.target.value.replace(/[^\d\s\-()]/g, ''))}
                placeholder="Phone number"
                className="flex-1 px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#246BFD] focus:ring-[#246BFD]"
              />
              <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                I accept the <span className="text-[#246BFD] font-medium">Terms</span> and <span className="text-[#246BFD] font-medium">Privacy Policy</span>
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleSendOtp}
              disabled={isLoading || !localPhone.trim() || !acceptedTerms}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send OTP'}
            </Button>

            <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}

        {showCountryPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">Select Country</h3>
                  <span className="text-xs text-gray-400">{COUNTRIES.length} countries</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search by name, code, or dial code..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none text-sm"
                    autoFocus
                  />
                </div>
              </div>
              {!countrySearch && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Popular</p>
                </div>
              )}
              <div className="overflow-y-auto flex-1">
                {!countrySearch && sortedCountries.filter(c => POPULAR_COUNTRY_CODES.includes(c.code)).map((country) => (
                  <button
                    key={'pop-' + country.code}
                    onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); setCountrySearch(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition-colors border-b border-gray-50 ${selectedCountry.code === country.code ? 'bg-[#E8F0FE]' : ''}`}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 text-left text-sm text-[#1A1A2E]">{country.name}</span>
                    <span className="text-sm text-gray-400 font-medium">{country.dialCode}</span>
                    {selectedCountry.code === country.code && <Check className="w-4 h-4 text-[#246BFD]" />}
                  </button>
                ))}
                {!countrySearch && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">All Countries</p>
                  </div>
                )}
                {filteredCountries.filter(c => countrySearch || !POPULAR_COUNTRY_CODES.includes(c.code)).map((country) => (
                  <button
                    key={country.code + country.dialCode}
                    onClick={() => { setSelectedCountry(country); setShowCountryPicker(false); setCountrySearch(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FC] transition-colors border-b border-gray-50 ${selectedCountry.code === country.code ? 'bg-[#E8F0FE]' : ''}`}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 text-left text-sm text-[#1A1A2E]">{country.name}</span>
                    <span className="text-sm text-gray-400 font-medium">{country.dialCode}</span>
                    {selectedCountry.code === country.code && <Check className="w-4 h-4 text-[#246BFD]" />}
                  </button>
                ))}
                {filteredCountries.length === 0 && <div className="py-8 text-center text-gray-400 text-sm">No countries found</div>}
              </div>
              <div className="p-3 border-t">
                <button onClick={() => { setShowCountryPicker(false); setCountrySearch(''); }} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {phoneStep === 'otp' && !isNewUser && (
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center">
                <Lock className="w-10 h-10 text-[#246BFD]" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-center text-[#1A1A2E]">Verify your number</h2>
            <p className="text-sm text-gray-500 text-center">
              Enter the 6-digit code sent to <strong className="text-gray-700">{phoneNumber}</strong>
            </p>

            <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { otpInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp[i] || ''}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold bg-[#F7F8FC] border rounded-xl outline-none transition-all ${
                    otp[i] ? 'border-[#246BFD]/50 text-[#1A1A2E]' : 'border-gray-200'
                  } focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]`}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="text-center text-sm">
              {resendTimer > 0 ? (
                <div className="flex items-center justify-center gap-1.5 text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Resend code in <strong className="text-gray-600">{resendTimer}s</strong></span>
                </div>
              ) : (
                <div>
                  <span className="text-gray-500">Didn't receive code? </span>
                  <button onClick={handleResendOtp} disabled={isLoading} className="text-[#246BFD] font-semibold hover:underline disabled:opacity-50">Resend</button>
                  {otpSentCount > 1 && <span className="text-gray-400 text-xs ml-2">(sent {otpSentCount}x)</span>}
                </div>
              )}
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={isLoading || otp.length < 6}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
            </Button>

            <button
              onClick={() => { setPhoneStep('phone'); setError(''); setOtp(''); setIsNewUser(false); }}
              className="w-full flex items-center justify-center gap-1 text-sm text-[#246BFD] hover:text-[#1A56DB] font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change Phone Number
            </button>
          </div>
        )}

        {(phoneStep === 'register' || (phoneStep === 'otp' && isNewUser)) && (
          <div className="space-y-4">
            <div className="flex flex-col items-center mb-2">
              <button
                onClick={handleProfilePhoto}
                className="w-24 h-24 rounded-full bg-[#E8F0FE] flex items-center justify-center hover:bg-[#D6E4FD] transition-colors relative overflow-hidden group"
              >
                {profilePhoto ? (
                  <>
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <Camera className="w-10 h-10 text-[#246BFD]" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
              <button onClick={handleProfilePhoto} className="text-sm text-[#246BFD] font-medium mt-2 hover:underline">
                {profilePhoto ? 'Change Photo' : 'Add Profile Photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">Optional</p>
            </div>

            <h2 className="text-lg font-bold text-center text-[#1A1A2E]">Create your profile</h2>
            <p className="text-sm text-gray-400 text-center">This is how others will see you</p>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#246BFD]" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                className="w-full pl-10 pr-16 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{displayName.length}/50</span>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleRegister}
              disabled={isLoading || !displayName.trim() || displayName.trim().length < 2}
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Account'}
            </Button>

            <button
              onClick={() => { setPhoneStep('otp'); setError(''); setIsNewUser(false); }}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
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
