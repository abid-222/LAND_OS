import React, { useState } from 'react';
import {
  X,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { useAuthStore, ROLE_DEFAULT_TABS, type UserRole } from '../lib/authStore';
import { api } from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const {
    user,
    isAuthenticated,
    sessionExpiredMessage,
    clearSessionMessage,
    login,
    logout,
  } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'mfa' | 'password' | 'consent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Consent states
  const [cameraConsent, setCameraConsent] = useState(true);
  const [storageConsent, setStorageConsent] = useState(true);
  const [termsConsent, setTermsConsent] = useState(true);
  const [consentSaved, setConsentSaved] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await login(email, password, totpCode || undefined);
    setIsLoading(false);

    if (res.mfaRequired) {
      setMode('mfa');
      setErrorMessage('প্রশাসনিক অ্যাকাউন্টের জন্য ৬ ডিজিটের MFA কোড প্রয়োজন।');
      return;
    }

    if (res.success) {
      const activeUser = useAuthStore.getState().user;
      const role = activeUser?.role || 'Citizen';
      const targetTab = ROLE_DEFAULT_TABS[role] || 'home';
      if (onNavigateToTab) {
        onNavigateToTab(targetTab);
      }
      onClose();
    } else {
      setErrorMessage(res.error || 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করুন।');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const pendingEmail = useAuthStore.getState().mfaPendingEmail || email;
    const res = await login(pendingEmail, password, totpCode);
    setIsLoading(false);

    if (res.success) {
      const activeUser = useAuthStore.getState().user;
      const role = activeUser?.role || 'Citizen';
      const targetTab = ROLE_DEFAULT_TABS[role] || 'home';
      if (onNavigateToTab) {
        onNavigateToTab(targetTab);
      }
      onClose();
    } else {
      setErrorMessage(res.error || 'ভুল MFA কোড। আবার চেষ্টা করুন।');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post('/api/v1/auth/password/change', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccessMessage('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error)?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConsent = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/v1/consent', {
        camera_granted: cameraConsent,
        storage_granted: storageConsent,
        terms_accepted: termsConsent,
        terms_version: 'v1.0.0-2026',
      });
      setConsentSaved(true);
      setTimeout(() => setConsentSaved(false), 3000);
    } catch {
      // Offline fallback saved in localStorage
      localStorage.setItem('landos_camera_consent', String(cameraConsent));
      localStorage.setItem('landos_offline_consent', String(storageConsent));
      setConsentSaved(true);
      setTimeout(() => setConsentSaved(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts: Array<{
    role: UserRole;
    email: string;
    label: string;
    isMfa?: boolean;
  }> = [
    { role: 'Citizen', email: 'citizen@landos.gov.bd', label: 'নাগরিক (Citizen)' },
    { role: 'Operator', email: 'operator@landos.gov.bd', label: 'অপারেটর (Operator)' },
    { role: 'Reviewer', email: 'reviewer@landos.gov.bd', label: 'রিভিউয়ার (Reviewer)' },
    { role: 'Supervisor', email: 'supervisor@landos.gov.bd', label: 'সুপারভাইজার (Supervisor)' },
    { role: 'Office Admin', email: 'office_admin@landos.gov.bd', label: 'অফিস অ্যাডমিন' },
    { role: 'Regional Manager', email: 'regional_manager@landos.gov.bd', label: 'আঞ্চলিক পরিচালক' },
    { role: 'Security Officer', email: 'security_officer@landos.gov.bd', label: 'নিরাপত্তা কর্মকর্তা (MFA)', isMfa: true },
    { role: 'Tech Admin', email: 'tech_admin@landos.gov.bd', label: 'টেক অ্যাডমিন (MFA)', isMfa: true },
  ];

  const handleQuickLogin = (demo: (typeof demoAccounts)[0]) => {
    setEmail(demo.email);
    setPassword('Password123!');
    if (demo.isMfa) {
      setTotpCode('123456');
    } else {
      setTotpCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              {isAuthenticated ? 'অ্যাকাউন্ট ও নিরাপত্তা সেটিংস' : 'ভূমিকাভিত্তিক লগইন'}
            </h2>
          </div>
          <button
            onClick={() => {
              clearSessionMessage();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Expired Banner */}
        {sessionExpiredMessage && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300 block">সেশন সমাপ্ত:</span>
              <span>{sessionExpiredMessage}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs if Authenticated */}
        {isAuthenticated && (
          <div className="flex border-b border-slate-800 mt-4 mb-4 text-xs font-medium">
            <button
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-emerald-400 text-emerald-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              প্রোফাইল
            </button>
            <button
              onClick={() => {
                setMode('password');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                mode === 'password'
                  ? 'border-emerald-400 text-emerald-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              পাসওয়ার্ড পরিবর্তন
            </button>
            <button
              onClick={() => {
                setMode('consent');
                setErrorMessage(null);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                mode === 'consent'
                  ? 'border-emerald-400 text-emerald-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              সম্মতি ও অনুমতি
            </button>
          </div>
        )}

        {/* Authenticated Profile View */}
        {isAuthenticated && mode === 'login' && user && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">নাম:</span>
                <span className="font-semibold text-white">{user.full_name_bn}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">ইমেইল:</span>
                <span className="font-mono text-slate-200">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">রোল (Role):</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                  {user.role}
                </span>
              </div>
              {user.office_id && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">অফিস আইডি:</span>
                  <span className="font-mono text-slate-300">{user.office_id}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট করুন</span>
              </button>
            </div>
          </div>
        )}

        {/* Unauthenticated Login Form */}
        {!isAuthenticated && mode === 'login' && (
          <div className="space-y-4 py-2">
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ইমেইল ঠিকানা (Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@landos.gov.bd"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  পাসওয়ার্ড (Password)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>সাইন ইন করুন</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                ডেমো অ্যাকাউন্ট নির্বাচন করুন (Quick Role Select):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {demoAccounts.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => handleQuickLogin(d)}
                    className={`p-2 rounded-lg text-left text-[11px] border transition-colors ${
                      email === d.email
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate font-medium">{d.label}</div>
                    <div className="text-[9px] text-slate-500 truncate font-mono">{d.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MFA Screen for Privileged Roles */}
        {mode === 'mfa' && (
          <form onSubmit={handleMfaSubmit} className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300 block">টু-ফ্যাক্টর প্রমাণীকরণ (MFA):</span>
                <span>
                  টেক অ্যাডমিন ও সিকিউরিটি অফিসার রোলে প্রবেশের জন্য আপনার প্রমাণীকরণ অ্যাপের ৬-সংখ্যার TOTP কোড লিখুন। ডেমো এনভায়রনমেন্টে কোড হিসেবে যেকোনো ৬ সংখ্যা বা <strong className="font-mono text-white">123456</strong> ব্যবহার করুন।
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ৬-সংখ্যার কোড (TOTP Code)
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-widest text-lg font-mono px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isLoading || totpCode.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                <span>যাচাই ও প্রবেশ</span>
              </button>
            </div>
          </form>
        )}

        {/* Password Change Form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-3 py-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                বর্তমান পাসওয়ার্ড
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                নতুন পাসওয়ার্ড পুনরায় লিখুন
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>পাসওয়ার্ড আপডেট করুন</span>
            </button>
          </form>
        )}

        {/* Consent & Privacy Page */}
        {mode === 'consent' && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
              <span className="font-bold text-white block">সংস্করণ: v1.0.0-2026</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                LandOS মোবাইল ও ক্লাউড নিরাপত্তা মানদণ্ড অনুযায়ী আপনার ডিভাইসের সম্পদ ব্যবহারের জন্য সম্মতির বিবরণ:
              </p>

              <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cameraConsent}
                  onChange={(e) => setCameraConsent(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">ক্যামেরা অ্যাক্সেস (দলিল স্ক্যানিংয়ের উদ্দেশ্যে)</span>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storageConsent}
                  onChange={(e) => setStorageConsent(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">অফলাইন এনক্রিপ্টেড স্টোরেজ (IndexedDB AES-GCM সংরক্ষণ)</span>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs text-slate-200">গোপনীয়তা নীতিমালা ও সেবা শর্তাবলী মেনে নিচ্ছি</span>
              </label>
            </div>

            {consentSaved && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>সম্মতি সফলভাবে হালনাগাদ করা হয়েছে।</span>
              </div>
            )}

            <button
              onClick={handleSaveConsent}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              <span>সম্মতি সংরক্ষণ করুন</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
