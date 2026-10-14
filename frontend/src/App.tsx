import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import './i18n';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

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

  return (
    <div className="flex flex-col min-h-screen-dvh bg-slate-950 text-slate-100 font-sans">
      <Header isHealthy={Boolean(health)} />
      <main className="flex-1 w-full">
        {activeTab === 'home' && <HomePage />}
        {activeTab !== 'home' && (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50dvh]">
            <span className="text-3xl mb-2">🚧</span>
            <h2 className="text-base font-semibold text-white">মডিউল প্রস্তুত হচ্ছে</h2>
            <p className="text-xs text-slate-400 mt-1">
              পরবর্তী ধাপে এই সেবাটি সক্রিয় করা হবে।
            </p>
          </div>
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
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
