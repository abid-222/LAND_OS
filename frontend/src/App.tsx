import React, { useState, useEffect, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import './i18n';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { getQueuedUploads } from './lib/offlineQueue';
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
  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentRole, setCurrentRole] = useState<'citizen' | 'staff' | 'admin' | 'quality'>('citizen');
  const [confirmDocId, setConfirmDocId] = useState<string>('');
  const [verifyRecordId, setVerifyRecordId] = useState<string>('REC-TG-001');
  const [selectedParcelId, setSelectedParcelId] = useState<string>('P-4520');
  const [searchParams, setSearchParams] = useState<{ khatian_no?: string; dag_no?: string; mouza?: string }>({});
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Poll pending count in Dexie queue
  useEffect(() => {
    const updatePending = async () => {
      try {
        const queued = await getQueuedUploads();
        setPendingCount(queued.length);
      } catch {}
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  // System Health
  const { data: health } = useQuery({
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
    if (tab === 'report') {
      if (params?.parcelId) setSelectedParcelId(params.parcelId);
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

  const handleRoleChange = (newRole: 'citizen' | 'staff' | 'admin' | 'quality') => {
    setCurrentRole(newRole);
    if (newRole === 'citizen') setActiveTab('home');
    if (newRole === 'staff') setActiveTab('staff');
    if (newRole === 'admin') setActiveTab('admin');
    if (newRole === 'quality') setActiveTab('quality');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen-dvh bg-slate-950 text-slate-100 font-sans selection:bg-primary selection:text-white">
      <Header
        isHealthy={Boolean(health)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
      />

      <main className="flex-1 w-full">
        <Suspense fallback={<PageLoader />}>
          {/* Staff Workspace View */}
          {currentRole === 'staff' && <StaffPage />}

          {/* Admin Panel View */}
          {currentRole === 'admin' && <AdminPage />}

          {/* Quality Lab View */}
          {currentRole === 'quality' && <QualityLabPage />}

          {/* Citizen Portal Views */}
          {currentRole === 'citizen' && (
            <>
              {activeTab === 'home' && <HomePage onNavigate={handleNavigate} />}

              {activeTab === 'scan' && (
                <ScanPage
                  onNavigateToConfirm={(docId) => handleNavigate('confirm', { documentId: docId })}
                  onNavigateToPending={() => handleNavigate('pending')}
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
                  onSelectRecord={(recId) => console.log('Selected record:', recId)}
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
                  userRole={currentRole}
                  onNavigateBack={() => handleNavigate('report', { parcelId: selectedParcelId })}
                />
              )}

              {activeTab === 'guide' && <GuidePage />}

              {activeTab === 'pending' && <PendingUploadsPage />}
            </>
          )}
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation (Shown primarily for Citizen Portal) */}
      {currentRole === 'citizen' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleNavigate}
          pendingCount={pendingCount}
        />
      )}
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

