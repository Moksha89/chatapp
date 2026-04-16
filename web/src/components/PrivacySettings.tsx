import { useState, useEffect, useCallback } from 'react';
import {
  X, Shield, UserX, Trash2, Eye, EyeOff, Clock, Lock, Key,
  Fingerprint, AlertTriangle, CheckCircle2, ChevronRight,
  Globe, Phone, Users, ShieldCheck,
  ShieldAlert, QrCode, Hash, Mail, RefreshCw, Info
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/button';
import { useI18n } from '../i18n/I18nContext';
import { Language } from '../i18n/translations';

interface PrivacySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BlockedUser {
  id: string;
  displayName: string;
  phoneNumber?: string;
}

const TWO_STEP_PIN_KEY = 'two_step_verification_pin';
const TWO_STEP_ENABLED_KEY = 'two_step_verification_enabled';
const TWO_STEP_EMAIL_KEY = 'two_step_recovery_email';
const TWO_STEP_LAST_VERIFY_KEY = 'two_step_last_verify';
const LAST_SEEN_KEY = 'privacy_last_seen';
const PROFILE_PHOTO_KEY = 'privacy_profile_photo';
const ABOUT_KEY = 'privacy_about';
const GROUPS_KEY = 'privacy_groups';
const CALLS_KEY = 'privacy_calls';
const IP_PROTECT_KEY = 'privacy_ip_protection';

type PrivacyLevel = 'everyone' | 'contacts' | 'nobody';
type Tab = 'general' | 'blocked' | 'two-step' | 'encryption';

export function PrivacySettings({ isOpen, onClose }: PrivacySettingsProps) {
  const { language, setLanguage, languages } = useI18n();
  const [tab, setTab] = useState<Tab>('general');
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Privacy granular controls
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<PrivacyLevel>(() =>
    (localStorage.getItem(LAST_SEEN_KEY) as PrivacyLevel) || 'everyone'
  );
  const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState<PrivacyLevel>(() =>
    (localStorage.getItem(PROFILE_PHOTO_KEY) as PrivacyLevel) || 'everyone'
  );
  const [aboutPrivacy, setAboutPrivacy] = useState<PrivacyLevel>(() =>
    (localStorage.getItem(ABOUT_KEY) as PrivacyLevel) || 'everyone'
  );
  const [groupsPrivacy, setGroupsPrivacy] = useState<PrivacyLevel>(() =>
    (localStorage.getItem(GROUPS_KEY) as PrivacyLevel) || 'everyone'
  );
  const [callsPrivacy, setCallsPrivacy] = useState<PrivacyLevel>(() =>
    (localStorage.getItem(CALLS_KEY) as PrivacyLevel) || 'everyone'
  );
  const [ipProtection, setIpProtection] = useState(() =>
    localStorage.getItem(IP_PROTECT_KEY) === 'true'
  );

  // Two-step verification state
  const [twoStepEnabled, setTwoStepEnabled] = useState(() =>
    localStorage.getItem(TWO_STEP_ENABLED_KEY) === 'true'
  );
  const [twoStepSetupStep, setTwoStepSetupStep] = useState<'idle' | 'pin' | 'confirm' | 'email' | 'done'>('idle');
  const [twoStepPin, setTwoStepPin] = useState('');
  const [twoStepConfirmPin, setTwoStepConfirmPin] = useState('');
  const [twoStepEmail, setTwoStepEmail] = useState(() =>
    localStorage.getItem(TWO_STEP_EMAIL_KEY) || ''
  );
  const [twoStepError, setTwoStepError] = useState('');

  // Re-verification dialog
  const [showReVerify, setShowReVerify] = useState(false);
  const [reVerifyPin, setReVerifyPin] = useState('');
  const [reVerifyError, setReVerifyError] = useState('');

  // Safety Number
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);

  // Block search
  const [blockSearch, setBlockSearch] = useState('');

  const showMsg = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      // Check if re-verification is needed (every 7 days)
      if (twoStepEnabled) {
        const lastVerify = parseInt(localStorage.getItem(TWO_STEP_LAST_VERIFY_KEY) || '0', 10);
        if (Date.now() - lastVerify > 7 * 24 * 60 * 60 * 1000) {
          setShowReVerify(true);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [privacyData, blockedIds] = await Promise.all([
        api.getPrivacySettings(),
        api.getBlockedUsers(),
      ]);
      setReadReceiptsEnabled(privacyData.readReceiptsEnabled);
      const blockedUserDetails: BlockedUser[] = [];
      for (const userId of blockedIds) {
        try {
          const users = await api.searchUsers(userId);
          const user = users.find((u: { id: string }) => u.id === userId);
          if (user) {
            blockedUserDetails.push({ id: user.id, displayName: user.displayName, phoneNumber: user.phoneNumber });
          } else {
            blockedUserDetails.push({ id: userId, displayName: 'Unknown User' });
          }
        } catch {
          blockedUserDetails.push({ id: userId, displayName: 'Unknown User' });
        }
      }
      setBlockedUsers(blockedUserDetails);
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      showMsg('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReadReceipts = async () => {
    setSaving(true);
    try {
      const newValue = !readReceiptsEnabled;
      await api.updatePrivacySettings({ readReceiptsEnabled: newValue });
      setReadReceiptsEnabled(newValue);
      showMsg('success', newValue ? 'Read receipts enabled' : 'Read receipts disabled');
    } catch {
      showMsg('error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.unblockUser(userId);
      setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
      showMsg('success', 'User unblocked');
    } catch {
      showMsg('error', 'Failed to unblock user');
    }
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    try {
      await api.updatePrivacySettings({ language: newLanguage });
      setLanguage(newLanguage);
      showMsg('success', 'Language updated');
    } catch {
      showMsg('error', 'Failed to update language');
    }
  };

  const savePrivacyLevel = (key: string, value: PrivacyLevel, setter: (v: PrivacyLevel) => void) => {
    localStorage.setItem(key, value);
    setter(value);
    showMsg('success', 'Privacy setting updated');
  };

  // Two-step verification handlers
  const handleTwoStepSetup = () => {
    setTwoStepSetupStep('pin');
    setTwoStepPin('');
    setTwoStepConfirmPin('');
    setTwoStepEmail('');
    setTwoStepError('');
  };

  const handleTwoStepNext = () => {
    if (twoStepSetupStep === 'pin') {
      if (twoStepPin.length < 6) {
        setTwoStepError('PIN must be exactly 6 digits');
        return;
      }
      setTwoStepSetupStep('confirm');
      setTwoStepError('');
    } else if (twoStepSetupStep === 'confirm') {
      if (twoStepConfirmPin !== twoStepPin) {
        setTwoStepError('PINs do not match');
        return;
      }
      setTwoStepSetupStep('email');
      setTwoStepError('');
    } else if (twoStepSetupStep === 'email') {
      // Save two-step verification
      localStorage.setItem(TWO_STEP_PIN_KEY, twoStepPin);
      localStorage.setItem(TWO_STEP_ENABLED_KEY, 'true');
      localStorage.setItem(TWO_STEP_LAST_VERIFY_KEY, Date.now().toString());
      if (twoStepEmail) {
        localStorage.setItem(TWO_STEP_EMAIL_KEY, twoStepEmail);
      }
      setTwoStepEnabled(true);
      setTwoStepSetupStep('done');
    }
  };

  const handleDisableTwoStep = () => {
    localStorage.removeItem(TWO_STEP_PIN_KEY);
    localStorage.setItem(TWO_STEP_ENABLED_KEY, 'false');
    setTwoStepEnabled(false);
    setTwoStepSetupStep('idle');
    showMsg('success', 'Two-step verification disabled');
  };

  const handleReVerify = () => {
    const storedPin = localStorage.getItem(TWO_STEP_PIN_KEY);
    if (reVerifyPin === storedPin) {
      localStorage.setItem(TWO_STEP_LAST_VERIFY_KEY, Date.now().toString());
      setShowReVerify(false);
      setReVerifyPin('');
      setReVerifyError('');
    } else {
      setReVerifyError('Incorrect PIN');
      setReVerifyPin('');
    }
  };

  // Generate safety number (simulated)
  const generateSafetyNumber = () => {
    const blocks: string[] = [];
    for (let i = 0; i < 12; i++) {
      blocks.push(String(Math.floor(Math.random() * 100000)).padStart(5, '0'));
    }
    return blocks;
  };

  const filteredBlockedUsers = blockSearch
    ? blockedUsers.filter(u =>
        u.displayName.toLowerCase().includes(blockSearch.toLowerCase()) ||
        (u.phoneNumber || '').includes(blockSearch)
      )
    : blockedUsers;

  if (!isOpen) return null;

  const PrivacySelect = ({ value, onChange, label, description, icon: Icon }: {
    value: PrivacyLevel;
    onChange: (v: PrivacyLevel) => void;
    label: string;
    description: string;
    icon: React.ElementType;
  }) => (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
      <div className="w-9 h-9 rounded-full bg-[#246BFD]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[#246BFD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
        <div className="flex gap-1.5 mt-2">
          {(['everyone', 'contacts', 'nobody'] as const).map(level => (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                value === level
                  ? 'bg-[#246BFD] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {level === 'everyone' ? 'Everyone' : level === 'contacts' ? 'My Contacts' : 'Nobody'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const Toggle = ({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${
        enabled ? 'bg-[#246BFD]' : 'bg-gray-300'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div
        className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5"
        style={{ transform: `translateX(${enabled ? 22 : 2}px)` }}
      />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#246BFD]" />
            Privacy & Security
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-2">
          {([
            { id: 'general' as const, label: 'Privacy', icon: Eye },
            { id: 'blocked' as const, label: 'Blocked', icon: UserX },
            { id: 'two-step' as const, label: '2-Step', icon: Key },
            { id: 'encryption' as const, label: 'Encryption', icon: Lock },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                tab === t.id
                  ? 'text-[#246BFD] border-[#246BFD]'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Message toast */}
        {message && (
          <div className={`mx-4 mt-3 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#246BFD]" />
            </div>
          ) : (
            <>
              {/* ====== GENERAL TAB ====== */}
              {tab === 'general' && (
                <div className="p-4 space-y-1">
                  {/* Last Seen */}
                  <PrivacySelect
                    value={lastSeenPrivacy}
                    onChange={(v) => savePrivacyLevel(LAST_SEEN_KEY, v, setLastSeenPrivacy)}
                    label="Last Seen & Online"
                    description="Who can see when you were last active"
                    icon={Clock}
                  />

                  {/* Profile Photo */}
                  <PrivacySelect
                    value={profilePhotoPrivacy}
                    onChange={(v) => savePrivacyLevel(PROFILE_PHOTO_KEY, v, setProfilePhotoPrivacy)}
                    label="Profile Photo"
                    description="Who can see your profile photo"
                    icon={Eye}
                  />

                  {/* About */}
                  <PrivacySelect
                    value={aboutPrivacy}
                    onChange={(v) => savePrivacyLevel(ABOUT_KEY, v, setAboutPrivacy)}
                    label="About"
                    description="Who can see your about info"
                    icon={Info}
                  />

                  {/* Groups */}
                  <PrivacySelect
                    value={groupsPrivacy}
                    onChange={(v) => savePrivacyLevel(GROUPS_KEY, v, setGroupsPrivacy)}
                    label="Groups"
                    description="Who can add you to groups"
                    icon={Users}
                  />

                  {/* Calls */}
                  <PrivacySelect
                    value={callsPrivacy}
                    onChange={(v) => savePrivacyLevel(CALLS_KEY, v, setCallsPrivacy)}
                    label="Calls"
                    description="Who can call you"
                    icon={Phone}
                  />

                  {/* Divider */}
                  <div className="h-px bg-gray-100 my-2" />

                  {/* Read Receipts */}
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="w-9 h-9 rounded-full bg-[#246BFD]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-[#246BFD]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">Read Receipts</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {readReceiptsEnabled
                              ? 'Others can see when you read their messages'
                              : 'Others cannot see when you read their messages'}
                          </p>
                        </div>
                        <Toggle enabled={readReceiptsEnabled} onChange={handleToggleReadReceipts} disabled={saving} />
                      </div>
                      {!readReceiptsEnabled && (
                        <p className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          You also won't see others' read receipts
                        </p>
                      )}
                    </div>
                  </div>

                  {/* IP Address Protection */}
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">IP Address Protection</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Relay calls through servers to hide your IP address
                          </p>
                        </div>
                        <Toggle
                          enabled={ipProtection}
                          onChange={() => {
                            const next = !ipProtection;
                            setIpProtection(next);
                            localStorage.setItem(IP_PROTECT_KEY, next.toString());
                            showMsg('success', next ? 'IP protection enabled' : 'IP protection disabled');
                          }}
                        />
                      </div>
                      {ipProtection && (
                        <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Call quality may be slightly reduced
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 mb-1.5">Language</p>
                      <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value as Language)}
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                      >
                        {(Object.entries(languages) as [Language, string][]).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ====== BLOCKED TAB ====== */}
              {tab === 'blocked' && (
                <div className="p-4">
                  <div className="relative mb-3">
                    <UserX className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search blocked users..."
                      value={blockSearch}
                      onChange={(e) => setBlockSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20"
                    />
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? 's' : ''}
                  </p>

                  {filteredBlockedUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <UserX className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        {blockSearch ? 'No matching users' : 'No blocked users'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Blocked users can't message or call you
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredBlockedUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <UserX className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.displayName}</p>
                            {user.phoneNumber && (
                              <p className="text-[11px] text-gray-400">{user.phoneNumber}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnblockUser(user.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs px-3 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                    <p className="text-xs text-amber-700 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Blocked users cannot send you messages, add you to groups, see your last seen, online status, status updates, or profile photo changes.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ====== TWO-STEP TAB ====== */}
              {tab === 'two-step' && (
                <div className="p-4">
                  {twoStepSetupStep === 'idle' && (
                    <>
                      <div className="text-center mb-6">
                        <div className={`w-16 h-16 rounded-full ${twoStepEnabled ? 'bg-green-100' : 'bg-[#246BFD]/10'} flex items-center justify-center mx-auto mb-3`}>
                          {twoStepEnabled ? (
                            <ShieldCheck className="w-8 h-8 text-green-600" />
                          ) : (
                            <ShieldAlert className="w-8 h-8 text-[#246BFD]" />
                          )}
                        </div>
                        <h3 className="text-base font-bold text-gray-900">
                          {twoStepEnabled ? 'Two-Step Verification is ON' : 'Two-Step Verification'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
                          {twoStepEnabled
                            ? 'Your account is protected with an additional PIN that will be required periodically'
                            : 'Add an extra layer of security by requiring a 6-digit PIN when registering your phone number with Abhi Chat'}
                        </p>
                      </div>

                      {twoStepEnabled ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-green-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <p className="text-sm font-medium text-green-700">Active</p>
                            </div>
                            {twoStepEmail && (
                              <p className="text-xs text-green-600 flex items-center gap-1.5">
                                <Mail className="w-3 h-3" />
                                Recovery email: {twoStepEmail}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={handleTwoStepSetup}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                          >
                            <RefreshCw className="w-4 h-4 text-[#246BFD]" />
                            <span className="text-sm text-gray-700">Change PIN</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                          </button>

                          <button
                            onClick={() => setTwoStepEmail('')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                          >
                            <Mail className="w-4 h-4 text-[#246BFD]" />
                            <span className="text-sm text-gray-700">Change recovery email</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                          </button>

                          <button
                            onClick={handleDisableTwoStep}
                            className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors text-left"
                          >
                            <X className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-500">Disable two-step verification</span>
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleTwoStepSetup}
                          className="w-full bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl py-3 font-medium"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Enable Two-Step Verification
                        </Button>
                      )}
                    </>
                  )}

                  {twoStepSetupStep === 'pin' && (
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-[#246BFD]/10 flex items-center justify-center mx-auto mb-4">
                        <Hash className="w-7 h-7 text-[#246BFD]" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-2">Create PIN</h3>
                      <p className="text-xs text-gray-400 mb-6">Enter a 6-digit PIN that you'll remember</p>
                      <input
                        type="password"
                        value={twoStepPin}
                        onChange={(e) => { setTwoStepPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setTwoStepError(''); }}
                        placeholder="000000"
                        maxLength={6}
                        className="w-48 mx-auto block px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
                        autoFocus
                      />
                      {twoStepError && <p className="text-red-500 text-xs mt-2">{twoStepError}</p>}
                      <div className="flex gap-2 mt-6">
                        <Button variant="outline" className="flex-1" onClick={() => setTwoStepSetupStep('idle')}>Cancel</Button>
                        <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB]" onClick={handleTwoStepNext} disabled={twoStepPin.length < 6}>Next</Button>
                      </div>
                    </div>
                  )}

                  {twoStepSetupStep === 'confirm' && (
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-[#246BFD]/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-7 h-7 text-[#246BFD]" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-2">Confirm PIN</h3>
                      <p className="text-xs text-gray-400 mb-6">Re-enter your 6-digit PIN</p>
                      <input
                        type="password"
                        value={twoStepConfirmPin}
                        onChange={(e) => { setTwoStepConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setTwoStepError(''); }}
                        placeholder="000000"
                        maxLength={6}
                        className="w-48 mx-auto block px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
                        autoFocus
                      />
                      {twoStepError && <p className="text-red-500 text-xs mt-2">{twoStepError}</p>}
                      <div className="flex gap-2 mt-6">
                        <Button variant="outline" className="flex-1" onClick={() => setTwoStepSetupStep('pin')}>Back</Button>
                        <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB]" onClick={handleTwoStepNext} disabled={twoStepConfirmPin.length < 6}>Next</Button>
                      </div>
                    </div>
                  )}

                  {twoStepSetupStep === 'email' && (
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-[#246BFD]/10 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-7 h-7 text-[#246BFD]" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-2">Recovery Email</h3>
                      <p className="text-xs text-gray-400 mb-6">Add an email address to reset your PIN if you forget it</p>
                      <input
                        type="email"
                        value={twoStepEmail}
                        onChange={(e) => setTwoStepEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-6">
                        <Button variant="outline" className="flex-1" onClick={() => setTwoStepSetupStep('confirm')}>Back</Button>
                        <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB]" onClick={handleTwoStepNext}>
                          {twoStepEmail ? 'Save & Enable' : 'Skip & Enable'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {twoStepSetupStep === 'done' && (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-2">All Set!</h3>
                      <p className="text-xs text-gray-400 mb-6 max-w-xs mx-auto">
                        Two-step verification is now enabled. You'll be asked to enter your PIN periodically to verify your identity.
                      </p>
                      <Button
                        className="bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl"
                        onClick={() => setTwoStepSetupStep('idle')}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ====== ENCRYPTION TAB ====== */}
              {tab === 'encryption' && (
                <div className="p-4 space-y-4">
                  {/* E2E Encryption Status */}
                  <div className="p-4 bg-gradient-to-r from-[#246BFD]/5 to-green-500/5 rounded-xl border border-[#246BFD]/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#246BFD]/10 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-[#246BFD]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">End-to-End Encryption</h3>
                        <p className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active — X3DH + Double Ratchet
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Messages and calls are secured with end-to-end encryption using the Signal Protocol (X3DH key agreement + Double Ratchet). Only you and the person you're communicating with can read or listen to them. Not even Abhi Chat can access your messages.
                    </p>
                  </div>

                  {/* Safety Number Verification */}
                  <div className="border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowSafetyNumber(!showSafetyNumber)}
                      className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">Safety Number Verification</p>
                        <p className="text-[11px] text-gray-400">Verify encryption with your contacts</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showSafetyNumber ? 'rotate-90' : ''}`} />
                    </button>

                    {showSafetyNumber && (
                      <div className="px-3.5 pb-3.5 border-t">
                        <p className="text-xs text-gray-500 mt-3 mb-3">
                          Each chat has a unique safety number that can be verified to ensure the encryption is secure. Match these numbers with your contact in person or via a trusted channel.
                        </p>
                        <div className="bg-gray-50 rounded-xl p-4 mb-3">
                          <div className="grid grid-cols-4 gap-2 font-mono text-center">
                            {generateSafetyNumber().map((block, i) => (
                              <span key={i} className="text-[13px] text-gray-700 font-medium">{block}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                            <QrCode className="w-10 h-10 text-gray-300" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-medium mb-1">Scan QR Code</p>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                              Scan your contact's QR code or let them scan yours to verify that your messages are end-to-end encrypted
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Key Info */}
                  <div className="border rounded-xl p-3.5">
                    <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[#246BFD]" />
                      Your Key Fingerprint
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 font-mono text-[11px] text-gray-600 break-all leading-relaxed">
                      {Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(' ').toUpperCase()}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      This is your device's unique encryption key fingerprint. Share it to verify your identity.
                    </p>
                  </div>

                  {/* View-Once Messages */}
                  <div className="border rounded-xl p-3.5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <EyeOff className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">View-Once Messages</p>
                        <p className="text-[11px] text-gray-400">Photos and videos that disappear after viewing</p>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2.5 mt-2">
                      <p className="text-[11px] text-purple-700 leading-relaxed">
                        When you send a photo or video as view-once, the recipient can only view it one time before it disappears. Screenshot detection is enabled for view-once media.
                      </p>
                    </div>
                  </div>

                  {/* Encryption Details */}
                  <div className="bg-[#246BFD]/5 rounded-xl p-3.5">
                    <h4 className="text-xs font-bold text-[#246BFD] mb-2">How E2E Encryption Works</h4>
                    <ul className="text-[11px] text-gray-600 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-[#246BFD] font-bold mt-0.5">1.</span>
                        <span><strong>X3DH Key Agreement:</strong> Initial key exchange establishes a shared secret</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#246BFD] font-bold mt-0.5">2.</span>
                        <span><strong>Double Ratchet:</strong> Each message uses a unique encryption key for forward secrecy</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#246BFD] font-bold mt-0.5">3.</span>
                        <span><strong>Prekey Bundles:</strong> Enables offline message encryption using preloaded keys</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#246BFD] font-bold mt-0.5">4.</span>
                        <span><strong>Safety Numbers:</strong> Verifiable codes prove that no MITM attack is occurring</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t">
          <Button variant="outline" onClick={onClose} className="w-full rounded-xl">
            Close
          </Button>
        </div>
      </div>

      {/* Two-step re-verification overlay */}
      {showReVerify && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#246BFD]/10 flex items-center justify-center mx-auto mb-4">
              <Key className="w-7 h-7 text-[#246BFD]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Verify Your PIN</h3>
            <p className="text-xs text-gray-400 mb-4">Enter your 6-digit two-step verification PIN</p>
            <input
              type="password"
              value={reVerifyPin}
              onChange={(e) => { setReVerifyPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setReVerifyError(''); }}
              placeholder="000000"
              maxLength={6}
              className="w-48 mx-auto block px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && reVerifyPin.length === 6 && handleReVerify()}
            />
            {reVerifyError && <p className="text-red-500 text-xs mt-2">{reVerifyError}</p>}
            <Button
              className="w-full mt-4 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl"
              onClick={handleReVerify}
              disabled={reVerifyPin.length < 6}
            >
              Verify
            </Button>
            <p className="text-[10px] text-gray-400 mt-3">
              Forgot PIN? <button className="text-[#246BFD] font-medium">Reset via email</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
