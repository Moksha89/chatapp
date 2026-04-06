import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Lock, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface BiometricLockProps {
  onUnlock: () => void;
}

const LOCK_TIMEOUT_KEY = 'biometric_lock_timeout';
const LOCK_ENABLED_KEY = 'biometric_lock_enabled';
const LOCK_PIN_KEY = 'biometric_lock_pin';
const LAST_ACTIVITY_KEY = 'biometric_last_activity';

export function useBiometricLock() {
  const [isLocked, setIsLocked] = useState(false);

  const isEnabled = () => localStorage.getItem(LOCK_ENABLED_KEY) === 'true';
  const getTimeout = () => parseInt(localStorage.getItem(LOCK_TIMEOUT_KEY) || '5', 10);

  const checkLock = useCallback(() => {
    if (!isEnabled()) return;
    const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
    const timeout = getTimeout() * 60 * 1000;
    if (Date.now() - lastActivity > timeout) {
      setIsLocked(true);
    }
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    checkLock();
    const interval = setInterval(checkLock, 30000);
    const handleActivity = () => {
      if (!isLocked) updateActivity();
    };
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [checkLock, updateActivity, isLocked]);

  return { isLocked, unlock, isEnabled: isEnabled() };
}

export function BiometricLockScreen({ onUnlock }: BiometricLockProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);

  useEffect(() => {
    setWebAuthnAvailable(
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  }, []);

  useEffect(() => {
    if (webAuthnAvailable) {
      handleWebAuthn();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webAuthnAvailable]);

  const handleWebAuthn = async () => {
    setIsAuthenticating(true);
    setError('');
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setError('Biometric authentication not available. Use PIN instead.');
        setIsAuthenticating(false);
        return;
      }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Abhi Chat', id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: 'user',
            displayName: 'Abhi Chat User',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      if (credential) {
        onUnlock();
      }
    } catch {
      setError('Authentication failed. Use PIN instead.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = () => {
    const storedPin = localStorage.getItem(LOCK_PIN_KEY);
    if (pin === storedPin) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-4" style={{backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(36, 107, 253, 0.06) 0%, transparent 50%)'}}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center border border-gray-100/50">
        <div className="w-20 h-20 rounded-full bg-[#E8F0FE] flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-[#246BFD]" />
        </div>

        <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">App Locked</h1>
        <p className="text-sm text-gray-400 mb-6">Verify your identity to continue</p>

        {webAuthnAvailable && (
          <button
            onClick={handleWebAuthn}
            disabled={isAuthenticating}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#246BFD] text-white rounded-xl font-medium mb-4 hover:bg-[#1A56DB] transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Fingerprint className="w-6 h-6" />
            {isAuthenticating ? 'Authenticating...' : 'Use Biometrics'}
          </button>
        )}

        <div className="relative mb-4">
          {webAuthnAvailable && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or use PIN</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="Enter PIN"
              maxLength={6}
              className="w-full px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
              onKeyDown={(e) => e.key === 'Enter' && pin.length >= 4 && handlePinSubmit()}
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 mb-4 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={handlePinSubmit}
          disabled={pin.length < 4}
          className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 disabled:opacity-50"
        >
          Unlock
        </Button>

        <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
          <Shield className="w-3 h-3" />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}

interface BiometricSettingsProps {
  className?: string;
}

export function BiometricSettings({ className }: BiometricSettingsProps) {
  const [enabled, setEnabled] = useState(localStorage.getItem(LOCK_ENABLED_KEY) === 'true');
  const [timeout, setTimeout_] = useState(parseInt(localStorage.getItem(LOCK_TIMEOUT_KEY) || '5', 10));
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const handleToggle = () => {
    if (!enabled) {
      if (!localStorage.getItem(LOCK_PIN_KEY)) {
        setShowPinSetup(true);
        return;
      }
    }
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(LOCK_ENABLED_KEY, next.toString());
    if (next) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  };

  const handleTimeoutChange = (val: number) => {
    setTimeout_(val);
    localStorage.setItem(LOCK_TIMEOUT_KEY, val.toString());
  };

  const handleSetPin = () => {
    if (newPin.length < 4) { setPinError('PIN must be at least 4 digits'); return; }
    if (newPin !== confirmPin) { setPinError('PINs do not match'); return; }
    localStorage.setItem(LOCK_PIN_KEY, newPin);
    localStorage.setItem(LOCK_ENABLED_KEY, 'true');
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    setEnabled(true);
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  };

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-[#246BFD]" />
        App Lock
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Enable App Lock</p>
            <p className="text-xs text-gray-400">Require authentication after inactivity</p>
          </div>
          <button
            onClick={handleToggle}
            className={`w-11 h-6 rounded-full transition-all ${enabled ? 'bg-[#246BFD]' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} style={{ transform: `translateX(${enabled ? 22 : 2}px)` }} />
          </button>
        </div>

        {enabled && (
          <div className="space-y-2 pl-2 border-l-2 border-[#246BFD]/20">
            <p className="text-xs text-gray-500 font-medium">Lock after</p>
            <div className="flex gap-2">
              {[1, 5, 15, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleTimeoutChange(mins)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    timeout === mins ? 'bg-[#246BFD] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowPinSetup(true)}
              className="text-xs text-[#246BFD] font-medium hover:underline mt-1"
            >
              Change PIN
            </button>
          </div>
        )}
      </div>

      {showPinSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-[#1A1A2E] mb-4">Set Lock PIN</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={newPin}
                onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
                placeholder="Enter 4-6 digit PIN"
                maxLength={6}
                className="w-full px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
                autoFocus
              />
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
                placeholder="Confirm PIN"
                maxLength={6}
                className="w-full px-4 py-3 bg-[#F7F8FC] border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
              />
              {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowPinSetup(false); setNewPin(''); setConfirmPin(''); setPinError(''); }}
                  className="flex-1 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-medium text-sm"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSetPin}
                  disabled={newPin.length < 4}
                  className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  Set PIN
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
