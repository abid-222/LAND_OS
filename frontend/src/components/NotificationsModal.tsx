import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, RefreshCw, AlertTriangle, FileCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

export interface NotificationItem {
  id: string;
  title_bn: string;
  message_bn: string;
  type: 'sync' | 'review' | 'alert' | 'system';
  is_read: boolean;
  created_at: string;
  link_tab?: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

const fallbackNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title_bn: 'অফলাইন নথি সিঙ্ক সম্পন্ন',
    message_bn: 'আপনার সংরক্ষিত বায়া দলিলের স্ক্যান সার্ভারে সফলভাবে আপলোড ও প্রক্রিয়াকরণ হয়েছে।',
    type: 'sync',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    link_tab: 'pending',
  },
  {
    id: 'notif-2',
    title_bn: 'পর্যালোচনা সিদ্ধান্ত গৃহীত',
    message_bn: 'দাগ নং ৩৪০/১ এর পর্যালোচক অনুমোদন সম্পন্ন করেছেন।',
    type: 'review',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    link_tab: 'staff',
  },
  {
    id: 'notif-3',
    title_bn: 'নতুন ঝুঁকি নির্দেশক শনাক্ত',
    message_bn: 'পার্সেল P-4520 এর দলিলের জমির পরিমাণের তারতম্য শনাক্ত হয়েছে।',
    type: 'alert',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
    link_tab: 'alerts',
  },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/api/v1/notifications');
      if (Array.isArray(data) && data.length > 0) {
        setNotifications(data);
      } else {
        setNotifications(fallbackNotifications);
      }
    } catch {
      setNotifications(fallbackNotifications);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  if (!isOpen) return null;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 max-h-[85dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">বিজ্ঞপ্তি ও নোটিফিকেশন</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
              <span>বিজ্ঞপ্তি লোড হচ্ছে...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              কোনো নতুন বিজ্ঞপ্তি নেই।
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.link_tab && onNavigateToTab) {
                    onNavigateToTab(item.link_tab);
                    onClose();
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  item.is_read
                    ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {item.type === 'sync' && <FileCheck className="w-4 h-4 text-emerald-400" />}
                    {item.type === 'review' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    {item.type === 'alert' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {item.type === 'system' && <Bell className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold truncate">{item.title_bn}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(item.created_at).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.message_bn}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <button
            onClick={markAllRead}
            className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>সব পঠিত চিহ্নিত করুন</span>
          </button>
          <button
            onClick={fetchNotifications}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="রিফ্রেশ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
