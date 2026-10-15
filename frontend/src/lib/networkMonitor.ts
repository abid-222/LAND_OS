import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  isLowNetworkMode: boolean;
  manualOverride: boolean | null;
  consecutiveFailures: number;
  effectiveType: string;
  saveData: boolean;
  lastHeartbeatCheck: number;
  setManualLowNetwork: (enabled: boolean | null) => void;
  recordFailedRequest: () => void;
  recordSuccessfulRequest: () => void;
  checkHeartbeat: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkState>((set, get) => {
  // Inspect Network Information API if available
  const navConn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean; addEventListener?: (type: string, listener: () => void) => void } }).connection;
  const initialEffectiveType = navConn?.effectiveType || '4g';
  const initialSaveData = Boolean(navConn?.saveData);

  const isSlowConnection = initialEffectiveType === '2g' || initialEffectiveType === 'slow-2g' || initialEffectiveType === '3g' || initialSaveData;

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLowNetworkMode: isSlowConnection,
    manualOverride: null,
    consecutiveFailures: 0,
    effectiveType: initialEffectiveType,
    saveData: initialSaveData,
    lastHeartbeatCheck: Date.now(),

    setManualLowNetwork: (enabled) => {
      set((state) => {
        const active = enabled !== null ? enabled : state.isLowNetworkMode;
        return {
          manualOverride: enabled,
          isLowNetworkMode: active,
        };
      });
    },

    recordFailedRequest: () => {
      set((state) => {
        const failures = state.consecutiveFailures + 1;
        const autoLowNetwork = failures >= 2;
        return {
          consecutiveFailures: failures,
          isLowNetworkMode: state.manualOverride !== null ? state.manualOverride : (state.isLowNetworkMode || autoLowNetwork),
        };
      });
    },

    recordSuccessfulRequest: () => {
      set((state) => ({
        consecutiveFailures: 0,
        isOnline: true,
        isLowNetworkMode: state.manualOverride !== null ? state.manualOverride : false,
      }));
    },

    checkHeartbeat: async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/v1/health', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const online = res.ok;
        set({ isOnline: online, lastHeartbeatCheck: Date.now() });
        return online;
      } catch {
        set({ isOnline: false, lastHeartbeatCheck: Date.now() });
        get().recordFailedRequest();
        return false;
      }
    },
  };
});

// Setup browser listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStore.getState().checkHeartbeat();
  });

  window.addEventListener('offline', () => {
    useNetworkStore.setState({ isOnline: false });
  });

  const navConn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean; addEventListener?: (type: string, listener: () => void) => void } }).connection;
  if (navConn?.addEventListener) {
    navConn.addEventListener('change', () => {
      const eff = navConn.effectiveType || '4g';
      const sd = Boolean(navConn.saveData);
      const isSlow = eff === '2g' || eff === 'slow-2g' || eff === '3g' || sd;
      useNetworkStore.setState((state) => ({
        effectiveType: eff,
        saveData: sd,
        isLowNetworkMode: state.manualOverride !== null ? state.manualOverride : isSlow,
      }));
    });
  }
}
