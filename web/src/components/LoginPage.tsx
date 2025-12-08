import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { MessageCircle, QrCode } from 'lucide-react';
import { QrLoginPage } from './QrLoginPage';

type Step = 'phone' | 'otp' | 'register';
type LoginMode = 'otp' | 'qr';

export function LoginPage() {
  const [loginMode, setLoginMode] = useState<LoginMode>('otp');
  const { login, register, sendOtp } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isBusiness, setIsBusiness] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await sendOtp(phoneNumber);
      if (result.otp) {
        setDevOtp(result.otp);
      }
      setStep('otp');
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
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('not found')) {
        setStep('register');
      } else {
        setError(message);
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
      await register(phoneNumber, otp, displayName, isBusiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

    if (loginMode === 'qr') {
      return <QrLoginPage onSwitchToOtp={() => setLoginMode('otp')} />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 to-green-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500 p-4 rounded-full">
                <MessageCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">WhatsApp Business Chat</CardTitle>
            <CardDescription>
              {step === 'phone' && 'Enter your phone number to get started'}
              {step === 'otp' && 'Enter the verification code'}
              {step === 'register' && 'Create your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          {devOtp && (
            <div className="bg-blue-50 text-blue-600 p-3 rounded-md mb-4 text-sm">
              Development OTP: <strong>{devOtp}</strong>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                />
              </div>
                        <Button
                          className="w-full bg-green-500 hover:bg-green-600"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Sending...' : 'Send OTP'}
                        </Button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setLoginMode('qr')}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Login with QR Code
                        </Button>
                      </div>
                    )}

          {step === 'otp' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  maxLength={6}
                />
              </div>
              <Button
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setDevOtp(null);
                }}
              >
                Change Phone Number
              </Button>
            </div>
          )}

          {step === 'register' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="business"
                  checked={isBusiness}
                  onCheckedChange={(checked) => setIsBusiness(checked === true)}
                />
                <Label htmlFor="business" className="text-sm font-normal">
                  This is a business account
                </Label>
              </div>
              <Button
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
