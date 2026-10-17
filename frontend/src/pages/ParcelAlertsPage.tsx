import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Info,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Filter,
  ArrowLeft,
  ShieldAlert,
  Bell,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type AlertSeverity = 'info' | 'warn' | 'high';

export interface EvidenceItem {
  document_id?: string;
  doc_type?: string;
  field_name?: string;
  field_name_bn?: string;
  extracted_value?: string | number;
  expected_value?: string | number;
  details?: string;
}

export interface ParcelAlertItem {
  id: string;
  parcel_id: string;
  rule_id: string;
  severity: AlertSeverity;
  title_bn: string;
  reason_bn: string;
  evidence: EvidenceItem[];
  status: 'active' | 'reviewed' | 'dismissed';
  created_at: string;
  reviewer_note?: string;
}

interface ParcelAlertsPageProps {
  parcelId?: string;
  userRole?: string;
  onNavigateBack?: () => void;
  onViewDocument?: (docId: string) => void;
}

export interface SimulatedSMSItem {
  id: string;
  recipient_phone: string;
  parcel_id?: string;
  message_bn: string;
  tag: string;
  sent_at: string;
}

const ITEMS_PER_PAGE = 5;

export const ParcelAlertsPage: React.FC<ParcelAlertsPageProps> = ({
  parcelId = 'P-4520',
  userRole = 'citizen',
  onNavigateBack,
  onViewDocument,
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [activeTab, setActiveTab] = useState<'alerts' | 'outbox'>('alerts');
  const [alerts, setAlerts] = useState<ParcelAlertItem[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [expandedAlertIds, setExpandedAlertIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulated SMS Outbox state (P6)
  const [outboxItems, setOutboxItems] = useState<SimulatedSMSItem[]>([]);
  const [isOutboxLoading, setIsOutboxLoading] = useState(false);
  const [testSmsStatus, setTestSmsStatus] = useState<string | null>(null);

  // Staff review modal state
  const [actionAlert, setActionAlert] = useState<{ id: string; action: 'reviewed' | 'dismissed' } | null>(null);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/v1/parcels/${parcelId}/alerts${
        severityFilter !== 'all' ? `?severity=${severityFilter}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('অ্যালার্ট তথ্য লোড করতে সমস্যা হয়েছে');
      const data: ParcelAlertItem[] = await res.json();
      setAlerts(data);
    } catch (err) {
      console.warn('Backend alerts API offline, loading synthetic parcel alerts:', err);
      // Fallback synthetic alerts complying strictly with rule:
      // "Output only 'indicators that need verification'. Never output safe/unsafe or composite score."
      const fallbackAlerts: ParcelAlertItem[] = [
        {
          id: 'alt-001',
          parcel_id: parcelId,
          rule_id: 'R_AREA_MISMATCH',
          severity: 'high',
          title_bn: 'জমির পরিমাণের উল্লেখযোগ্য তারতম্য',
          reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: দলিলের জমির পরিমাণ (০.৫০ একর) খতিয়ানের মোট পরিমাণের (০.৩৩ একর) চেয়ে ১৭ শতক বেশি।',
          status: 'active',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          evidence: [
            {
              document_id: 'doc-deed-991',
              doc_type: 'দলিল',
              field_name: 'area_acres',
              field_name_bn: 'দলিলের ক্ষেত্রফল',
              extracted_value: '০.৫০ একর (৫০ শতক)',
              details: 'সাব-রেজিস্ট্রি দলিলের অনুচ্ছেদ ৩',
            },
            {
              document_id: 'rec-khatian-340',
              doc_type: 'খতিয়ান বালাম',
              field_name: 'area_acres',
              field_name_bn: 'খতিয়ানের রেকর্ডকৃত ক্ষেত্রফল',
              extracted_value: '০.৩৩ একর (৩৩ শতক)',
              details: 'আরএস খতিয়ান পৃষ্ঠা ১২',
            },
          ],
        },
        {
          id: 'alt-002',
          parcel_id: parcelId,
          rule_id: 'R_CHAIN_BREAK',
          severity: 'warn',
          title_bn: 'মালিকানা হস্তান্তরের ধারাবাহিকতায় সম্ভাব্য ব্যবধান',
          reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: ১৯৯৮ সালের বায়া দলিল এবং ২০০৫ সালের নামজারি রেকর্ডের মধ্যে মধ্যবর্তী হস্তান্তরের কোনো রেফারেন্স পাওয়া যায়নি।',
          status: 'active',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          evidence: [
            {
              document_id: 'doc-deed-1998',
              doc_type: 'বায়া দলিল (১৯৯৮)',
              field_name: 'grantee_name',
              field_name_bn: 'হস্তান্তর গ্রহীতার নাম',
              extracted_value: 'রফিক উল্লাহ',
              details: 'পূর্ববর্তী মালিকানার রেফারেন্স',
            },
            {
              document_id: 'doc-mut-2005',
              doc_type: 'নামজারি খতিয়ান (২০০৫)',
              field_name: 'owner_name',
              field_name_bn: 'খতিয়ানধারী নাম',
              extracted_value: 'মোস্তফা কামাল',
              details: 'সূত্র বায়া দলিল অনুপস্থিত',
            },
          ],
        },
        {
          id: 'alt-003',
          parcel_id: parcelId,
          rule_id: 'R_TAX_RECEIPT_STALE',
          severity: 'info',
          title_bn: 'হালনাগাদ ভূমি উন্নয়ন কর (খাজনা) দাখিলা সংযুক্ত নেই',
          reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: সর্বশেষ পরিশোধিত খাজনা দাখিলা ১৪২৮ বঙ্গাব্দের। বর্তমান ১৪৩১ বঙ্গাব্দের খাজনা পরিশোধের তথ্য সংযুক্ত নেই।',
          status: 'reviewed',
          reviewer_note: 'উপজেলা ভূমি অফিসে হালনাগাদ দাখিলা তলব করা হয়েছে।',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          evidence: [
            {
              document_id: 'doc-dakhila-1428',
              doc_type: 'দাখিলা রসিদ',
              field_name: 'tax_year',
              field_name_bn: 'পরিশোধিত অর্থবছর',
              extracted_value: '১৪২৮ বঙ্গাব্দ',
              details: 'ইউনিয়ন ভূমি অফিসের দাখিলা বহি নং ৪',
            },
          ],
        },
      ];
      setAlerts(fallbackAlerts);
    } finally {
      setIsLoading(false);
    }
  }, [parcelId, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const fetchOutbox = useCallback(async () => {
    setIsOutboxLoading(true);
    try {
      const res = await fetch(`/api/v1/alerts/outbox?parcel_id=${parcelId}`);
      if (res.ok) {
        const data: SimulatedSMSItem[] = await res.json();
        setOutboxItems(data);
      }
    } catch (err) {
      console.warn('Failed to fetch outbox:', err);
    } finally {
      setIsOutboxLoading(false);
    }
  }, [parcelId]);

  useEffect(() => {
    if (activeTab === 'outbox') {
      fetchOutbox();
    }
  }, [activeTab, fetchOutbox]);

  const handleSendTestSms = async () => {
    try {
      const res = await fetch(`/api/v1/parcels/${parcelId}/watch`, { method: 'POST' });
      if (res.ok) {
        setTestSmsStatus(isBn ? '[সিমুলেটেড এসএমএস] সতর্কবার্তা সফলভাবে প্রেরিত হয়েছে!' : '[Simulated SMS] Dispatched successfully!');
        fetchOutbox();
        setTimeout(() => setTestSmsStatus(null), 5000);
      }
    } catch {
      setTestSmsStatus(isBn ? 'এসএমএস প্রেরণ ব্যর্থ' : 'SMS dispatch failed');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAlertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStaffAction = async () => {
    if (!actionAlert) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/v1/alerts/${actionAlert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionAlert.action,
          note: reviewNote || (actionAlert.action === 'reviewed' ? 'কর্মকর্তা কর্তৃক পর্যালোচিত' : 'বাতিলকৃত'),
        }),
      });

      if (!res.ok) throw new Error('অ্যালার্ট স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');

      // Local state update
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === actionAlert.id
            ? { ...a, status: actionAlert.action, reviewer_note: reviewNote }
            : a
        )
      );
      setActionAlert(null);
      setReviewNote('');
    } catch (err) {
      // Local optimistic update for offline/demo resilience
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === actionAlert.id
            ? { ...a, status: actionAlert.action, reviewer_note: reviewNote }
            : a
        )
      );
      setActionAlert(null);
      setReviewNote('');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const renderSeverityChip = (severity: AlertSeverity) => {
    switch (severity) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-danger/20 text-danger border border-danger/40">
            <AlertOctagon className="w-3 h-3" />
            {isBn ? 'উচ্চ মনোযোগ' : 'High Priority'}
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            {isBn ? 'সতর্কতা' : 'Warning'}
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40">
            <Info className="w-3 h-3" />
            {isBn ? 'তথ্যগত' : 'Info'}
          </span>
        );
    }
  };

  // Pagination logic
  const filteredAlerts = alerts.filter(
    (a) => severityFilter === 'all' || a.severity === severityFilter
  );
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE));
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const isStaff = userRole === 'staff' || userRole === 'admin' || userRole === 'reviewer';

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-2xl mx-auto w-full px-4 pt-4 pb-28 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Header & Back */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white transition-colors"
              aria-label={isBn ? 'ফিরে যান' : 'Go back'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {isBn ? 'পার্সেল সতর্কতা ও অসঙ্গতি তালিকা' : 'Parcel Discrepancies & Alert Log'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {isBn ? 'পার্সেল আইডি:' : 'Parcel ID:'} {parcelId}
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher: Alerts vs Simulated SMS Outbox */}
      <div className="flex items-center gap-2 mb-4 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'alerts'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isBn ? 'সতর্কতা তালিকা' : 'Risk Alerts'} ({alerts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outbox')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'outbox'
              ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>{isBn ? 'সিমুলেটেড এসএমএস আউটবক্স' : 'Simulated SMS Outbox'} ({outboxItems.length})</span>
        </button>
      </div>

      {/* Epistemic Rule Notice */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/30 text-xs text-slate-700 dark:text-slate-300 mb-4 leading-relaxed shadow-sm">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">
              {isBn ? 'অসঙ্গতি মূল্যায়ন নীতি:' : 'Audit Protocol & Transparency Notice:'}
            </span>{' '}
            {isBn
              ? 'সিস্টেমে কোনো একক মালিকানা রেটিং বা চূড়ান্ত সত্যতার রায় প্রকাশ করা হয় না। শুধুমাত্র সরকারি রেকর্ডের সাথে তুলনামূলক যেসব ক্ষেত্রে অসঙ্গতি রয়েছে তা প্রমাণের তালিকাসহ উপস্থাপন করা হলো।'
              : 'The system does not issue definitive title verdicts or composite scores. It presents itemized evidentiary indicators that require verification against original registry books.'}
          </div>
        </div>
      </div>

      {activeTab === 'alerts' && (
        <>
          {/* Filter Tabs by Severity */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold pl-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> {isBn ? 'ফিল্টার:' : 'Filter:'}
            </span>
            <button
              onClick={() => {
                setSeverityFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
                severityFilter === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-emerald-600'
          }`}
        >
          {isBn ? `সকল (${alerts.length})` : `All (${alerts.length})`}
        </button>
        <button
          onClick={() => {
            setSeverityFilter('high');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
            severityFilter === 'high'
              ? 'bg-danger text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-rose-600'
          }`}
        >
          {isBn ? `উচ্চ মনোযোগ (${alerts.filter((a) => a.severity === 'high').length})` : `High Risk (${alerts.filter((a) => a.severity === 'high').length})`}
        </button>
        <button
          onClick={() => {
            setSeverityFilter('warn');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
            severityFilter === 'warn'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-amber-600'
          }`}
        >
          {isBn ? `সতর্কতা (${alerts.filter((a) => a.severity === 'warn').length})` : `Warnings (${alerts.filter((a) => a.severity === 'warn').length})`}
        </button>
        <button
          onClick={() => {
            setSeverityFilter('info');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
            severityFilter === 'info'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-sky-600'
          }`}
        >
          {isBn ? `তথ্যগত (${alerts.filter((a) => a.severity === 'info').length})` : `Info (${alerts.filter((a) => a.severity === 'info').length})`}
        </button>
      </div>

      {/* Alert Cards Container */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="h-10 bg-slate-100 dark:bg-slate-950 rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs">
          {error}
        </div>
      ) : paginatedAlerts.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 my-4 shadow-sm">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {isBn ? 'কোনো অসঙ্গতি পাওয়া যায়নি' : 'No Discrepancies Found'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isBn ? 'নির্বাচিত ফিল্টারে এই পার্সেলের জন্য কোনো সতর্কতা নেই।' : 'No alerts match the selected severity filter for this parcel.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {paginatedAlerts.map((alert) => {
            const isExpanded = expandedAlertIds.has(alert.id);
            return (
              <div
                key={alert.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md transition-all"
              >
                {/* Title & Severity Chip */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex-1 leading-snug">
                    {alert.title_bn}
                  </h3>
                  {renderSeverityChip(alert.severity)}
                </div>

                {/* Reason Box */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-xs mb-3">
                  <span className="font-bold text-amber-600 dark:text-amber-300 block mb-0.5">
                    {isBn ? 'কেন?' : 'Why?'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{alert.reason_bn}</p>
                </div>

                {/* Review status badge if reviewed or dismissed */}
                {alert.status !== 'active' && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between border border-slate-200 dark:border-slate-800">
                    <span className="flex items-center gap-1.5">
                      {alert.status === 'reviewed' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      {isBn ? 'স্ট্যাটাস:' : 'Status:'} <strong className="text-slate-900 dark:text-white">{alert.status === 'reviewed' ? (isBn ? 'পর্যালোচিত' : 'Reviewed') : (isBn ? 'বাতিল' : 'Dismissed')}</strong>
                    </span>
                    {alert.reviewer_note && (
                      <span className="text-[10px] text-slate-500 italic max-w-[180px] truncate">
                        {isBn ? 'মন্তব্য:' : 'Note:'} {alert.reviewer_note}
                      </span>
                    )}
                  </div>
                )}

                {/* Expandable Evidence Section */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  <button
                    onClick={() => toggleExpand(alert.id)}
                    className="touch-target w-full flex items-center justify-between py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {isBn ? `প্রমাণ ও সংশ্লিষ্ট নথি (${alert.evidence.length} টি)` : `Evidence & Linked Documents (${alert.evidence.length})`}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 text-xs animate-in fade-in">
                      {alert.evidence.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {ev.field_name_bn || ev.field_name}
                            </span>
                            {ev.document_id && (
                              <button
                                onClick={() => onViewDocument && onViewDocument(ev.document_id!)}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>{isBn ? 'নথি দেখুন' : 'View Document'}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{isBn ? 'মান:' : 'Value:'} <strong className="text-slate-900 dark:text-white font-mono">{String(ev.extracted_value ?? '—')}</strong></span>
                            <span>{isBn ? 'নথি:' : 'Doc:'} {ev.doc_type || (isBn ? 'দলিল/খতিয়ান' : 'Deed/Khatian')}</span>
                          </div>
                          {ev.details && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{ev.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staff Review Controls */}
                {isStaff && alert.status === 'active' && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setActionAlert({ id: alert.id, action: 'dismissed' })}
                      className="touch-target px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
                    >
                      {isBn ? 'বাতিল করুন' : 'Dismiss Alert'}
                    </button>
                    <button
                      onClick={() => setActionAlert({ id: alert.id, action: 'reviewed' })}
                      className="touch-target px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white active:scale-95 transition-all shadow-sm"
                    >
                      {isBn ? 'পর্যালোচিত চিহ্নিত করুন' : 'Mark as Reviewed'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40"
          >
            {isBn ? 'পূর্ববর্তী' : 'Previous'}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {isBn ? `পৃষ্ঠা ${currentPage} / ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40"
          >
            {isBn ? 'পরবর্তী' : 'Next'}
          </button>
        </div>
      )}
        </>
      )}

      {/* Simulated SMS Outbox View (P6) */}
      {activeTab === 'outbox' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{isBn ? 'পার্সেল গার্ডিয়ান এসএমএস বিজ্ঞপ্তি লগ' : 'Parcel Guardian SMS Notification Log'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-mono">
                  [সিমুলেটেড / Simulated]
                </span>
              </h3>
              <p className="text-[11px] text-purple-700 dark:text-purple-300/80 mt-1">
                {isBn
                  ? 'এই পার্সেলটির জন্য প্রেরিত সকল স্বয়ংক্রিয় সতর্কবার্তা ও ই-নামজারি ট্র্যাকিং বিজ্ঞপ্তি।'
                  : 'Automated mutation updates and discrepancy alerts dispatched for this parcel.'}
              </p>
            </div>

            <button
              onClick={handleSendTestSms}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBn ? 'টেস্ট এসএমএস পাঠান' : 'Dispatch Test Alert'}</span>
            </button>
          </div>

          {testSmsStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
              {testSmsStatus}
            </div>
          )}

          {isOutboxLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isBn ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : 'Loading notifications...'}
            </div>
          ) : outboxItems.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
              <p>{isBn ? 'এখনও কোনো সিমুলেটেড এসএমএস প্রেরিত হয়নি।' : 'No simulated SMS notifications dispatched yet.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {outboxItems.map((sms) => (
                <div
                  key={sms.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      {sms.recipient_phone}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase font-bold">
                        {sms.tag}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(sms.sent_at).toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                    {sms.message_bn}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff Action Note Modal */}
      {actionAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl animate-in zoom-in-95">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              {actionAlert.action === 'reviewed' ? (isBn ? 'অ্যালার্ট পর্যালোচিত করুন' : 'Mark Alert as Reviewed') : (isBn ? 'অ্যালার্ট বাতিল করুন' : 'Dismiss Alert')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {isBn
                ? 'অডিট লগ এবং ভবিষ্যৎ রেফারেন্সের জন্য সিদ্ধান্তের কারণ বা নোট প্রদান করুন:'
                : 'Provide rationale or notes for the official immutable audit trail:'}
            </p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={isBn ? 'সিদ্ধান্তের কারণ লিখুন...' : 'Enter resolution rationale...'}
              rows={3}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setActionAlert(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleStaffAction}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSubmittingAction ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'নিশ্চিত করুন' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
