import { create } from 'zustand';
import { api, ApiError, setUnauthorizedHandler } from '../api/client';

export type UserRole =
  | 'Citizen'
  | 'Operator'
  | 'Reviewer'
  | 'Supervisor'
  | 'Office Admin'
  | 'Regional Manager'
  | 'Security Officer'
  | 'Tech Admin';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string | null;
  full_name_bn: string;
  full_name_en?: string | null;
  role: UserRole;
  office_id?: string | null;
  region_id?: string | null;
  is_active: boolean;
  mfa_enabled?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  returnTab: string | null;
  mfaPendingEmail: string | null;
  checkSession: () => Promise<UserProfile | null>;
  login: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; mfaRequired?: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearSessionMessage: () => void;
  setReturnTab: (tab: string | null) => void;
}

export const ROLE_DEFAULT_TABS: Record<UserRole, string> = {
  Citizen: 'home',
  Operator: 'staff',
  Reviewer: 'staff',
  Supervisor: 'staff',
  'Office Admin': 'admin',
  'Regional Manager': 'admin',
  'Security Officer': 'admin',
  'Tech Admin': 'quality',
};

export const TAB_ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  home: ['Citizen'],
  scan: ['Citizen'],
  confirm: ['Citizen', 'Operator', 'Reviewer'],
  verify: ['Citizen', 'Operator', 'Reviewer', 'Supervisor'],
  search: ['Citizen', 'Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager'],
  map: ['Citizen', 'Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager', 'Security Officer', 'Tech Admin'],
  report: ['Citizen', 'Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager'],
  alerts: ['Citizen', 'Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager'],
  guide: ['Citizen', 'Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager', 'Security Officer', 'Tech Admin'],
  pending: ['Citizen'],
  staff: ['Operator', 'Reviewer', 'Supervisor'],
  admin: ['Office Admin', 'Regional Manager', 'Security Officer'],
  quality: ['Tech Admin'],
};

export function canAccessTab(tab: string, role?: UserRole | null): boolean {
  // Public tabs if unauthenticated
  if (!role) {
    return ['home', 'search', 'guide', 'map', 'report'].includes(tab);
  }
  const allowed = TAB_ROLE_PERMISSIONS[tab];
  if (!allowed) return true;
  return allowed.includes(role);
}

export const useAuthStore = create<AuthState>((set) => {
  // Register unauthorized handler with api client
  setUnauthorizedHandler((message, _returnUrl) => {
    set({
      user: null,
      isAuthenticated: false,
      sessionExpiredMessage: message,
    });
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionExpiredMessage: null,
    returnTab: null,
    mfaPendingEmail: null,

    setReturnTab: (tab: string | null) => set({ returnTab: tab }),

    clearSessionMessage: () => set({ sessionExpiredMessage: null }),

    checkSession: async () => {
      set({ isLoading: true });
      try {
        const user = await api.get<UserProfile>('/api/v1/auth/me');
        if (user && user.role) {
          set({ user, isAuthenticated: true, isLoading: false, sessionExpiredMessage: null });
          return user;
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      } catch (err) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      }
    },

    login: async (email: string, password: string, totpCode?: string) => {
      try {
        const payload: { email: string; password: string; totp_code?: string } = {
          email,
          password,
        };
        if (totpCode) {
          payload.totp_code = totpCode;
        }

        const user = await api.post<UserProfile>('/api/v1/auth/login', payload);
        set({
          user,
          isAuthenticated: true,
          sessionExpiredMessage: null,
          mfaPendingEmail: null,
        });
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.isMfaRequired) {
            set({ mfaPendingEmail: email });
            return { success: false, mfaRequired: true };
          }
          return { success: false, error: err.message };
        }
        return { success: false, error: 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।' };
      }
    },

    logout: async () => {
      try {
        await api.post('/api/v1/auth/logout');
      } catch (err) {
        console.warn('Logout API failed:', err);
      } finally {
        set({
          user: null,
          isAuthenticated: false,
          sessionExpiredMessage: null,
          returnTab: null,
        });
      }
    },
  };
});
