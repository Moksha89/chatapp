import { useState } from 'react';
import { Settings, Check, Loader2, Database, Shield, FileText, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface SetupStatus {
  isSetupCompleted: boolean;
  hasAdmin: boolean;
  hasUsers: boolean;
  hasDefaultSettings: boolean;
  hasDefaultPages: boolean;
  hasDefaultReportCategories: boolean;
  databaseConnected: boolean;
}

interface StepResult {
  step: string;
  status: string;
}

export function InstallWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0); // 0=welcome, 1=config, 2=running, 3=done
  const [appName, setAppName] = useState('Abhi');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [seedDefaults, setSeedDefaults] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);
  const [error, setError] = useState('');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/setup/status`);
      const data = await res.json() as SetupStatus;
      setSetupStatus(data);
      setStep(1);
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.');
    }
  };

  const runSetup = async () => {
    if (adminPassword && adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (adminPassword && adminPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setRunning(true);
    setStep(2);

    try {
      const res = await fetch(`${API_URL}/admin/setup/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName.trim() || undefined,
          adminPassword: adminPassword || undefined,
          seedDefaults,
        }),
      });
      const data = await res.json() as { success: boolean; steps: StepResult[] };
      setResults(data.steps || []);
      setStep(3);
    } catch {
      setError('Setup failed. Please check server logs.');
      setStep(1);
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#246BFD] via-[#1A56DB] to-[#6C5CE7] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#246BFD] to-[#6C5CE7] p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">Install Wizard</h1>
          </div>
          <p className="text-white/80 text-sm">Set up your Abhi application</p>
          {/* Step indicators */}
          <div className="flex gap-2 mt-4">
            {['Welcome', 'Configure', 'Install', 'Complete'].map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
                <p className={`text-xs mt-1 ${i <= step ? 'text-white' : 'text-white/50'}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#246BFD]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-[#246BFD]" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Abhi</h2>
              <p className="text-gray-500 text-sm mb-6">
                This wizard will help you configure your application for the first time.
                It will set up default settings, report categories, and page content.
              </p>
              <button
                onClick={checkStatus}
                className="w-full py-3 bg-[#246BFD] text-white rounded-xl font-medium hover:bg-[#1A56DB] transition"
              >
                Get Started
              </button>
              <button
                onClick={onComplete}
                className="w-full mt-2 py-3 text-gray-500 text-sm hover:text-gray-700 transition"
              >
                Skip Setup
              </button>
            </div>
          )}

          {/* Step 1: Configure */}
          {step === 1 && (
            <div>
              {setupStatus && (
                <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Status</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <StatusItem label="Database" ok={setupStatus.databaseConnected} />
                    <StatusItem label="Admin Account" ok={setupStatus.hasAdmin} />
                    <StatusItem label="Default Settings" ok={setupStatus.hasDefaultSettings} />
                    <StatusItem label="Default Pages" ok={setupStatus.hasDefaultPages} />
                    <StatusItem label="Report Categories" ok={setupStatus.hasDefaultReportCategories} />
                    <StatusItem label="Registered Users" ok={setupStatus.hasUsers} />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={e => setAppName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F7F8FC] border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]"
                    placeholder="Abhi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Password <span className="text-gray-400 font-normal">(optional, change default)</span>
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F7F8FC] border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]"
                    placeholder="Leave empty to keep default"
                  />
                </div>

                {adminPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F7F8FC] border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]"
                      placeholder="Confirm new password"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 p-3 bg-[#F7F8FC] rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seedDefaults}
                    onChange={e => setSeedDefaults(e.target.checked)}
                    className="w-4 h-4 rounded text-[#246BFD]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Seed Default Data</p>
                    <p className="text-xs text-gray-400">Create default settings, report categories, and page content</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-3 text-gray-500 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  onClick={runSetup}
                  className="flex-1 py-3 bg-[#246BFD] text-white rounded-xl font-medium hover:bg-[#1A56DB] transition"
                >
                  Run Setup
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Running */}
          {step === 2 && running && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-[#246BFD] animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Setting Up...</h2>
              <p className="text-gray-500 text-sm">Please wait while we configure your application.</p>
            </div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Setup Complete!</h2>
                <p className="text-gray-500 text-sm">Your application has been configured successfully.</p>
              </div>

              <div className="space-y-2 mb-6">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                    {r.status === 'completed' ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className={r.status === 'completed' ? 'text-gray-700' : 'text-red-600'}>{r.step}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 mb-4">
                <p className="font-medium mb-1">Next Steps:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>Log in to the admin panel at <strong>/admin</strong></li>
                  <li>Default admin: <strong>admin</strong> / <strong>{adminPassword || 'Admin@123456'}</strong></li>
                  <li>Configure your business profile and settings</li>
                </ul>
              </div>

              <button
                onClick={onComplete}
                className="w-full py-3 bg-[#246BFD] text-white rounded-xl font-medium hover:bg-[#1A56DB] transition"
              >
                Go to Application
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <div className="w-4 h-4 flex items-center justify-center">
          {label === 'Database' ? <Database className="w-3.5 h-3.5 text-green-500" /> :
           label === 'Admin Account' ? <Shield className="w-3.5 h-3.5 text-green-500" /> :
           <FileText className="w-3.5 h-3.5 text-green-500" />}
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
        </div>
      )}
      <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </div>
  );
}
