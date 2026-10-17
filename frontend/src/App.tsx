import React, { useState, useEffect, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import './i18n';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Forbidden403 } from './components/Forbidden403';
import { MaintenanceBanner } from './components/MaintenanceBanner';
import { DemoTourModal } from './components/DemoTourModal';
import { RoleSwitchTerminal } from './components/RoleSwitchTerminal';
import { ChatbotWidget } from './components/ChatbotWidget';
import { getQueuedUploads } from './lib/offlineQueue';
import { useNetworkStore } from './lib/networkMonitor';
import {
  useAuthStore,
  canAccessTab,
  ROLE_DEFAULT_TABS,
  type UserRole,
} from './lib/authStore';
import { RefreshCw } from 'lucide-react';

// Route-level lazy loading for optimal bundle size and performance (Lighthouse >= 90)
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })));
const ConfirmPage = lazy(() => import('./pages/ConfirmPage').then((m) => ({ default: m.ConfirmPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })));
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const PendingUploadsPage = lazy(() => import('./pages/PendingUploadsPage').then((m) => ({ default: m.PendingUploadsPage })));
const VerificationPage = lazy(() => import('./pages/VerificationPage').then((m) => ({ default: m.VerificationPage })));
const ParcelAlertsPage = lazy(() => import('./pages/ParcelAlertsPage').then((m) => ({ default: m.ParcelAlertsPage })));
const BuyerReportPage = lazy(() => import('./pages/BuyerReportPage').then((m) => ({ default: m.BuyerReportPage })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const QualityLabPage = lazy(() => import('./pages/QualityLabPage').then((m) => ({ default: m.QualityLabPage })));
const MLStudioPage = lazy(() => import('./pages/MLStudioPage').then((m) => ({ default: m.MLStudioPage })));
const NamjariPage = lazy(() => import('./pages/NamjariPage').then((m) => ({ default: m.NamjariPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50dvh] text-center p-6 text-slate-400">
    <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
    <span className="text-xs font-medium">পৃষ্ঠা লোড হচ্ছে...</span>
  </div>
);

const AppContent: React.FC = () => {
  const { user, checkSession, returnTab, setReturnTab } = useAuthStore();
  const currentRole: UserRole = user?.role || 'Citizen';

  const [activeTab, setActiveTab] = useState<string>('home');
  const [confirmDocId, setConfirmDocId] = useState<string>('');
  const [verifyRecordId, setVerifyRecordId] = useState<string>('REC-TG-001');
  const [selectedParcelId, setSelectedParcelId] = useState<string>('P-4520');
  const [searchParams, setSearchParams] = useState<{ khatian_no?: string; dag_no?: string; mouza?: string }>({});
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Modern UI states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState(false);
  const [isRoleTerminalOpen, setIsRoleTerminalOpen] = useState(false);

  // Dark / Light Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('landos-theme');
      if (saved) return saved === 'dark';
      return true; // default cyber dark
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      localStorage.setItem('landos-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      localStorage.setItem('landos-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const { isOnline } = useNetworkStore();

  // Validate server session on startup
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Navigate to role landing page on session restoration unless returnTab is active
  useEffect(() => {
    if (user?.role && !returnTab) {
      setActiveTab(ROLE_DEFAULT_TABS[user.role] || 'home');
    }
  }, [user?.role, returnTab]);

  // If user just logged in and had a return tab, navigate there
  useEffect(() => {
    if (returnTab) {
      setActiveTab(returnTab);
      setReturnTab(null);
    }
  }, [returnTab, setReturnTab]);

  // Poll pending count in Dexie queue
  useEffect(() => {
    const updatePending = async () => {
      try {
        const queued = await getQueuedUploads();
        setPendingCount(queued.length);
      } catch (err) {
        console.debug('Failed to get queued uploads', err);
      }
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  // System Health Polling
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health-check'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/health');
        return res.ok;
      } catch {
        return false;
      }
    },
    refetchInterval: 15000,
  });

  const handleNavigate = (tab: string, params?: Record<string, string>) => {
    if (tab === 'confirm' && params?.documentId) {
      setConfirmDocId(params.documentId);
    }
    if (tab === 'verify') {
      if (params?.documentId) setConfirmDocId(params.documentId);
      if (params?.recordId) setVerifyRecordId(params.recordId);
    }
    if (tab === 'report' || tab === 'buyer-report') {
      if (params?.parcelId) setSelectedParcelId(params.parcelId);
      tab = 'report';
    }
    if (tab === 'alerts') {
      if (params?.parcelId) setSelectedParcelId(params.parcelId);
    }
    if (tab === 'search' && params) {
      setSearchParams({
        khatian_no: params.khatian_no || params.query,
        dag_no: params.dag_no,
        mouza: params.mouza,
      });
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleChange = (newRole: UserRole) => {
    // If selecting a demo role without full login, switch target tab
    const targetTab = ROLE_DEFAULT_TABS[newRole] || 'home';
    setActiveTab(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Guard: enforce server role permission check
  const isTabAllowed = canAccessTab(activeTab, currentRole);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#070b0e] text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Left Persistent & Responsive Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleNavigate}
        pendingCount={pendingCount}
        currentRole={currentRole}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenAuthModal={() => setIsRoleTerminalOpen(true)}
        onStartTour={() => setIsDemoTourOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Right Area: Top Header + Scrollable Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <Header
          isHealthy={Boolean(health)}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          onNavigateToTab={handleNavigate}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onStartTour={() => setIsDemoTourOpen(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onOpenLogin={() => setIsRoleTerminalOpen(true)}
        />

        {/* Maintenance & Offline Warning Banner */}
        <MaintenanceBanner
          isHealthy={Boolean(health)}
          isOnline={isOnline}
          onRetry={() => refetchHealth()}
        />

        <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-6">
          <Suspense fallback={<PageLoader />}>
            {/* Direct Route Guard: Show 403 Forbidden Screen if not allowed */}
            {!isTabAllowed ? (
              <Forbidden403 onReturnToAllowed={(tab) => handleNavigate(tab)} />
            ) : (
              <>
                {/* Staff Workspace View */}
                {activeTab === 'staff' && <StaffPage onNavigateToTab={handleNavigate} />}

                {/* Admin Panel View */}
                {activeTab === 'admin' && <AdminPage />}

                {/* Quality Lab View */}
                {activeTab === 'quality' && <QualityLabPage />}

                {/* Citizen & Shared Portal Views */}
                {activeTab === 'home' && (
                  <HomePage
                    onNavigate={handleNavigate}
                    currentRole={currentRole}
                    onStartTour={() => setIsDemoTourOpen(true)}
                    onOpenLogin={() => setIsRoleTerminalOpen(true)}
                    isDarkMode={isDarkMode}
                  />
                )}

                {activeTab === 'scan' && (
                  <ScanPage
                    onNavigateToConfirm={(docId) => handleNavigate('confirm', { documentId: docId })}
                    onNavigateToPending={() => handleNavigate('pending')}
                    onNavigateToSearch={() => handleNavigate('search')}
                  />
                )}

                {activeTab === 'confirm' && (
                  <ConfirmPage
                    documentId={confirmDocId || 'e1b5c920-3b1a-4d9a-9e12-876a45bc3d21'}
                    onNavigateToSearch={(params) => handleNavigate('search', params)}
                    onNavigateToVerify={(docId, recId) =>
                      handleNavigate('verify', { documentId: docId, recordId: recId || 'REC-TG-001' })
                    }
                  />
                )}

                {activeTab === 'verify' && (
                  <VerificationPage
                    documentId={confirmDocId || 'doc-test-1234'}
                    recordId={verifyRecordId || 'REC-TG-001'}
                    onNavigateToReport={(pid) => handleNavigate('report', { parcelId: pid })}
                    onNavigateToConfirm={(docId) => handleNavigate('confirm', { documentId: docId })}
                  />
                )}

                {activeTab === 'search' && (
                  <SearchPage
                    initialKhatian={searchParams.khatian_no}
                    initialDag={searchParams.dag_no}
                    initialMouza={searchParams.mouza}
                    onSelectRecord={(recId) => handleNavigate('verify', { recordId: recId })}
                    onNavigateToBuyerReport={(pid) => handleNavigate('report', { parcelId: pid })}
                    onNavigateToMap={() => handleNavigate('map')}
                  />
                )}

                {activeTab === 'map' && (
                  <MapPage
                    onNavigateToReport={(pid) => handleNavigate('report', { parcelId: pid })}
                  />
                )}

                {activeTab === 'report' && (
                  <BuyerReportPage
                    initialParcelId={selectedParcelId || 'P-4520'}
                    onNavigateToAlerts={(pid) => handleNavigate('alerts', { parcelId: pid })}
                    onNavigateToMap={() => handleNavigate('map')}
                  />
                )}

                {activeTab === 'alerts' && (
                  <ParcelAlertsPage
                    parcelId={selectedParcelId || 'P-4520'}
                    userRole={currentRole.toLowerCase() as 'citizen' | 'staff' | 'admin' | 'quality'}
                    onNavigateBack={() => handleNavigate('report', { parcelId: selectedParcelId })}
                  />
                )}

                {activeTab === 'guide' && <GuidePage />}

                {activeTab === 'ml' && <MLStudioPage onNavigateToTab={handleNavigate} />}

                {activeTab === 'namjari' && (
                  <NamjariPage
                    onNavigateToTab={handleNavigate}
                    initialParcelId={selectedParcelId}
                  />
                )}

                {activeTab === 'pending' && <PendingUploadsPage />}
              </>
            )}
          </Suspense>
        </main>

        {/* Mobile & Tablet Quick Bottom Navigation (Strictly hidden on web/desktop) */}
        {!['confirm', 'verify'].includes(activeTab) && (
          <div className="md:hidden">
            <BottomNav
              activeTab={activeTab}
              onTabChange={handleNavigate}
              pendingCount={pendingCount}
            />
          </div>
        )}

        {/* Floating AI Land Guide & Voice Assistant */}
        <ChatbotWidget onNavigate={handleNavigate} />

        {/* Interactive Guided Tour Modal */}
        <DemoTourModal
          isOpen={isDemoTourOpen}
          onClose={() => setIsDemoTourOpen(false)}
          onNavigateToTab={handleNavigate}
        />

        {/* Instant RBAC Role Switch Terminal */}
        <RoleSwitchTerminal
          isOpen={isRoleTerminalOpen}
          onClose={() => setIsRoleTerminalOpen(false)}
          onRoleChanged={handleRoleChange}
        />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
