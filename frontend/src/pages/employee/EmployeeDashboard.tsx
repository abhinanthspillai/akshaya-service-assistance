import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Loader2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  History,
  FileCheck
} from 'lucide-react';
import { formatStatus } from '../../utils/format';

interface ServiceRequest {
  id: string;
  status: string;
  service_name_snapshot: string;
  service_type_snapshot: string;
  fee_snapshot: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  selected_centre_id: string | null;
  citizen_id: string;
}

interface RecentActivityItem {
  id: string;
  request_id: string;
  action: string;
  note: string | null;
  created_at: string;
  actor_id: string | null;
  request_service_name: string;
  request_citizen_id: string;
}

interface DashboardBuckets {
  new: number;
  in_review: number;
  awaiting_citizen: number;
  completed_today: number;
  rejected_last_30_days: number;
}

interface DashboardData {
  status_counts: Record<string, number>;
  completed_today: number;
  rejected_last_30_days: number;
  buckets: DashboardBuckets;
  needs_attention: ServiceRequest[];
  recent_activity: RecentActivityItem[];
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  WAITING_FOR_CENTRE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  ACCEPTED: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  UNDER_REVIEW: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  CORRECTION_REQUIRED: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  READY_FOR_PROCESSING: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  PROCESSING: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  PAYMENT_PENDING: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  INTERACTION_REQUIRED: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  INTERACTION_SCHEDULED: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  UNABLE_TO_PROCEED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
};

export function EmployeeDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    try {
      const res = await api.get('/requests/dashboard');
      setDashboard(res.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="animate-spin text-mono-text" size={40} />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={32} />
          <h3 className="text-lg font-bold text-red-900 mb-2">Failed to load dashboard</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboard(true)}
            className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const navigateToFiltered = (filterStr: string) => {
    navigate(`/employee/requests?status=${filterStr}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-mono-text tracking-tight">Akshaya Centre Dashboard</h1>
        </div>
        <button
          onClick={() => fetchDashboard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-mono-border rounded-lg hover:bg-mono-accent/5 transition-all text-mono-muted hover:text-mono-text font-medium group shadow-sm"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button onClick={() => navigateToFiltered('WAITING_FOR_CENTRE,ACCEPTED')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <p className="text-sm font-medium text-mono-muted mb-1">New Intake</p>
          <h3 className="text-3xl font-bold text-mono-text">{dashboard.buckets.new}</h3>
        </button>

        <button onClick={() => navigateToFiltered('UNDER_REVIEW,READY_FOR_PROCESSING,PROCESSING')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <Clock size={24} />
          </div>
          <p className="text-sm font-medium text-mono-muted mb-1">In Progress</p>
          <h3 className="text-3xl font-bold text-mono-text">{dashboard.buckets.in_review}</h3>
        </button>

        <button onClick={() => navigateToFiltered('CORRECTION_REQUIRED,INTERACTION_REQUIRED,INTERACTION_SCHEDULED,PAYMENT_PENDING')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
            <AlertCircle size={24} />
          </div>
          <p className="text-sm font-medium text-mono-muted mb-1">Awaiting Citizen</p>
          <h3 className="text-3xl font-bold text-mono-text">{dashboard.buckets.awaiting_citizen}</h3>
        </button>

        <button onClick={() => navigateToFiltered('COMPLETED')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm font-medium text-mono-muted mb-1">Completed Today</p>
          <h3 className="text-3xl font-bold text-mono-text">{dashboard.buckets.completed_today}</h3>
        </button>

        <button onClick={() => navigateToFiltered('UNABLE_TO_PROCEED')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm font-medium text-mono-muted mb-1">Rejected (30d)</p>
          <h3 className="text-3xl font-bold text-mono-text">{dashboard.buckets.rejected_last_30_days}</h3>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-mono-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-mono-border flex justify-between items-center bg-mono-bg/30">
            <h2 className="text-lg font-bold text-mono-text flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              Needs Attention
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {dashboard.needs_attention.length === 0 ? (
              <div className="text-center py-12 text-mono-muted">
                <FileCheck size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-mono-text">Queue is clear</p>
                <p className="text-sm mt-1">No requests currently need your attention.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {dashboard.needs_attention.map(req => {
                  const badge = STATUS_BADGES[req.status] || STATUS_BADGES['WAITING_FOR_CENTRE'];
                  return (
                    <button
                      key={req.id}
                      onClick={() => navigate(`/employee/requests/${req.id}`)}
                      className="w-full text-left p-4 rounded-xl hover:bg-mono-accent/5 transition-all flex items-center justify-between group border border-transparent hover:border-mono-border/50"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-xs text-mono-muted">
                            {req.id.split('-')[0].toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {formatStatus(req.status)}
                          </span>
                        </div>
                        <p className="font-semibold text-mono-text line-clamp-1">{req.service_name_snapshot}</p>
                      </div>
                      <ChevronRight size={20} className="text-mono-muted opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-mono-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-mono-border bg-mono-bg/30">
            <h2 className="text-lg font-bold text-mono-text flex items-center gap-2">
              <History size={20} className="text-indigo-500" />
              Recent Activity
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {dashboard.recent_activity.length === 0 ? (
              <div className="text-center py-12 text-mono-muted">
                <p>No recent activity recorded.</p>
              </div>
            ) : (
              <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-mono-border before:to-transparent">
                {dashboard.recent_activity.map((activity, i) => (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-6 last:mb-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-50 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <ArrowUpRight size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-mono-border shadow-sm group-hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-mono-text capitalize">{activity.action.replace(/_/g, ' ')}</span>
                        <time className="text-xs font-mono text-mono-muted">
                          {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="text-sm text-mono-muted line-clamp-1 mb-2">{activity.request_service_name}</p>
                      {activity.note && (
                        <div className="text-sm bg-mono-bg p-2 rounded border border-mono-border/50 text-mono-text/80 italic">
                          "{activity.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
