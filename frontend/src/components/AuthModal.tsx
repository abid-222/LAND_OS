import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Smartphone,
  ShieldCheck,
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
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

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
      setErrorMessage(
        isBn
          ? 'প্রশাসনিক অ্যাকাউন্টের জন্য ৬ ডিজিটের এমএফএ কোড প্রয়োজন।'
          : 'Administrative account requires 6-digit MFA authenticator code.'
      );
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
      setErrorMessage(
        res.error ||
          (isBn ? 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করুন।' : 'Login failed. Please check your credentials.')
      );
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
      setErrorMessage(
        res.error || (isBn ? 'ভুল এমএফএ কোড। পুনরায় চেষ্টা করুন।' : 'Invalid MFA code. Please try again.')
      );
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage(isBn ? 'নতুন পাসওয়ার্ড দুটি মেলেনি।' : 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(
        isBn
          ? 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'
          : 'New password must be at least 8 characters long.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccessMessage(
        isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' : 'Password changed successfully!'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setErrorMessage(
        isBn
          ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। বর্তমান পাসওয়ার্ড যাচাই করুন।'
          : 'Failed to update password. Please check your current password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConsent = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/consent', {
        camera: cameraConsent,
        offline_storage: storageConsent,
        terms_accepted: termsConsent,
      });
      setConsentSaved(true);
      setTimeout(() => setConsentSaved(false), 3000);
    } catch {
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
    labelBn: string;
    labelEn: string;
    isMfa?: boolean;
  }> = [
    { role: 'Citizen', email: 'citizen@landos.gov.bd', labelBn: 'সাধারণ নাগরিক', labelEn: 'Citizen (Public)' },
    { role: 'Operator', email: 'operator@landos.gov.bd', labelBn: 'ইউনিয়ন সহকারী কর্মকর্তা', labelEn: 'Land Assistant Officer' },
    { role: 'Reviewer', email: 'reviewer@landos.gov.bd', labelBn: 'কানুনগো ও সার্ভেয়ার', labelEn: 'Kanungo & Surveyor Reviewer' },
    { role: 'Supervisor', email: 'supervisor@landos.gov.bd', labelBn: 'সহকারী কমিশনার (ভূমি)', labelEn: 'Assistant Commissioner (Land)' },
    { role: 'Office Admin', email: 'officeadmin@landos.gov.bd', labelBn: 'রেকর্ড ও প্রশাসন শাখা', labelEn: 'Records & Administration' },
    { role: 'Regional Manager', email: 'regionalmanager@landos.gov.bd', labelBn: 'অতিরিক্ত জেলা প্রশাসক', labelEn: 'ADC (Revenue)' },
    { role: 'Security Officer', email: 'securityofficer@landos.gov.bd', labelBn: 'সাইবার ও নিরাপত্তা কর্মকর্তা', labelEn: 'Security Officer (MFA)', isMfa: true },
    { role: 'Tech Admin', email: 'techadmin@landos.gov.bd', labelBn: 'সিস্টেম অ্যাডমিন', labelEn: 'Technical Admin (MFA)', isMfa: true },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/30 p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[92dvh] overflow-y-auto transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isAuthenticated
                ? isBn
                  ? 'অ্যাকাউন্ট ও নিরাপত্তা সেটিংস'
                  : 'Account & Security Settings'
                : isBn
                ? 'ভূমিকাভিত্তিক সাইন ইন'
                : 'Role-Based Authentication'}
            </h2>
          </div>
          <button
            onClick={() => {
              clearSessionMessage();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session Expired Banner */}
        {sessionExpiredMessage && (
          <div className="mt-3.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">{isBn ? 'সেশন সমাপ্ত:' : 'Session Ended:'}</span>
              <span>{sessionExpiredMessage}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs if Authenticated */}
        {isAuthenticated && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 mt-4 mb-4 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {isBn ? 'প্রোফাইল' : 'Profile'}
            </button>
            <button
              onClick={() => {
                setMode('password');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                mode === 'password'
                  ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
            </button>
            <button
              onClick={() => {
                setMode('consent');
                setErrorMessage(null);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                mode === 'consent'
                  ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {isBn ? 'সম্মতি ও অনুমতি' : 'Consent & Privileges'}
            </button>
          </div>
        )}

        {/* Authenticated Profile View */}
        {isAuthenticated && mode === 'login' && user && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">{isBn ? 'নাম:' : 'Full Name:'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {isBn ? user.full_name_bn : user.full_name_en || user.full_name_bn}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">{isBn ? 'ইমেইল:' : 'Email:'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">{isBn ? 'ভূমিকা:' : 'Role:'}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  {user.role}
                </span>
              </div>
              {user.office_id && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">{isBn ? 'অফিস কোড:' : 'Office ID:'}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">{user.office_id}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{isBn ? 'লগআউট করুন' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Unauthenticated Login Form */}
        {!isAuthenticated && mode === 'login' && (
          <div className="space-y-4 py-2">
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@landos.gov.bd"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'যাচাই হচ্ছে...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{isBn ? 'সাইন ইন করুন' : 'Sign In'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
                {isBn ? 'দ্রুত ভূমিকা নির্বাচন:' : 'Quick Role Selection:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => handleQuickLogin(d)}
                    className={`p-2.5 rounded-xl text-left text-xs border transition-all ${
                      email === d.email
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-black/50 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="truncate font-semibold">{isBn ? d.labelBn : d.labelEn}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono mt-0.5">
                      {d.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MFA Screen */}
        {mode === 'mfa' && (
          <form onSubmit={handleMfaSubmit} className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                  {isBn ? 'দ্বিমুখী প্রমাণীকরণ (MFA):' : 'Two-Factor Authentication (MFA):'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  {isBn
                    ? 'আপনার প্রমাণীকরণ অ্যাপের ৬-সংখ্যার TOTP কোড লিখুন। ডেমো পরীক্ষার জন্য 123456 ব্যবহার করুন।'
                    : 'Enter the 6-digit TOTP code from your authenticator app. For evaluation testing, use 123456.'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? '৬-সংখ্যার কোড' : '6-Digit TOTP Code'}
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
                className="w-full text-center tracking-widest text-lg font-mono px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 border border-slate-300 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isLoading || totpCode.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                <span>{isBn ? 'যাচাই ও প্রবেশ' : 'Verify & Sign In'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Password Change Form */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)' : 'New Password (min 8 characters)'}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'নতুন পাসওয়ার্ড পুনরায় লিখুন' : 'Confirm New Password'}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isBn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}</span>
            </button>
          </form>
        )}

        {/* Consent & Privacy Page */}
        {mode === 'consent' && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              <span className="font-bold text-slate-900 dark:text-white block">
                {isBn ? 'নিরাপত্তা ও অ্যাক্সেস অনুমতি' : 'Security & Access Permissions'}
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {isBn
                  ? 'LandOS নিরাপত্তা মানদণ্ড অনুযায়ী আপনার ডিভাইসের সেবা ব্যবহারের সম্মতির বিবরণ:'
                  : 'LandOS security standards and device permission settings:'}
              </p>

              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cameraConsent}
                  onChange={(e) => setCameraConsent(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  {isBn
                    ? 'ক্যামেরা ও স্ক্যানার অ্যাক্সেস (দলিল স্ক্যানিংয়ের জন্য)'
                    : 'Camera & Scanner Access (for document capture)'}
                </span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storageConsent}
                  onChange={(e) => setStorageConsent(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  {isBn
                    ? 'অফলাইন এনক্রিপ্টেড স্টোরেজ (IndexedDB AES-GCM সংরক্ষণ)'
                    : 'Offline Encrypted Storage (IndexedDB AES-GCM local queue)'}
                </span>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-xs text-slate-700 dark:text-slate-200">
                  {isBn
                    ? 'গোপনীয়তা নীতিমালা ও সেবা শর্তাবলী মেনে নিচ্ছি'
                    : 'I agree to the Terms of Service & Privacy Policy'}
                </span>
              </label>
            </div>

            {consentSaved && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{isBn ? 'সম্মতি সফলভাবে সংরক্ষিত হয়েছে।' : 'Permissions updated successfully.'}</span>
              </div>
            )}

            <button
              onClick={handleSaveConsent}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              <span>{isBn ? 'অনুমতি সংরক্ষণ করুন' : 'Save Permissions'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
