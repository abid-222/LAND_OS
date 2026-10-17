import React from 'react';
import { MLPlayground } from '../components/MLPlayground';

interface MLStudioPageProps {
  onNavigateToTab?: (tab: string) => void;
}

export const MLStudioPage: React.FC<MLStudioPageProps> = ({ onNavigateToTab }) => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
      <MLPlayground onBack={onNavigateToTab ? () => onNavigateToTab('home') : undefined} />
    </div>
  );
};
