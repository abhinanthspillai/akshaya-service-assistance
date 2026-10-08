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
import { formatStatus, formatRelativeTime } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/ui/Avatar';

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
  const [stats, setStats] = useState<DashboardBuckets | null>(null);
  const [needsAttention, setNeedsAttention] = useState<ServiceRequest[] | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[] | null>(null);
  
  const [loading, setLoading] = useState({ stats: true, attention: true, activity: true });
  const [errors, setErrors] = useState({ stats: '', attention: '', activity: '' });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    
    // Start independent fetches
    const fetchStats = async () => {
      setLoading(p => ({ ...p, stats: true }));
      try {
        const res = await api.get('/requests/dashboard/stats');
        setStats(res.data);
        setErrors(p => ({ ...p, stats: '' }));
      } catch (e: any) {
        setErrors(p => ({ ...p, stats: 'Failed to load stats' }));
      } finally {
        setLoading(p => ({ ...p, stats: false }));
      }
    };

    const fetchAttention = async () => {
      setLoading(p => ({ ...p, attention: true }));
      try {
        const res = await api.get('/requests/dashboard/needs-attention');
        setNeedsAttention(res.data);
        setErrors(p => ({ ...p, attention: '' }));
      } catch (e: any) {
        setErrors(p => ({ ...p, attention: 'Failed to load queue' }));
      } finally {
        setLoading(p => ({ ...p, attention: false }));
      }
    };

    const fetchActivity = async () => {
      setLoading(p => ({ ...p, activity: true }));
      try {
        const res = await api.get('/requests/dashboard/recent-activity');
        setRecentActivity(res.data);
        setErrors(p => ({ ...p, activity: '' }));
      } catch (e: any) {
        setErrors(p => ({ ...p, activity: 'Failed to load activity' }));
      } finally {
        setLoading(p => ({ ...p, activity: false }));
      }
    };

    await Promise.allSettled([fetchStats(), fetchAttention(), fetchActivity()]);
    if (isRefresh) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const navigateToFiltered = (filterStr: string) => {
    navigate(`/employee/requests?status=${filterStr}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar photoUrl={user?.photo_url} name={user?.full_name || 'Employee'} className="w-16 h-16 text-2xl" />
          <div>
            <h1 className="text-3xl font-bold text-mono-text tracking-tight">Akshaya Centre Dashboard</h1>
            <p className="text-mono-muted mt-1">Welcome back, {user?.full_name || 'Employee'}</p>
          </div>
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
        {loading.stats ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm flex flex-col justify-between h-32 animate-pulse">
              <div className="w-12 h-12 bg-mono-accent/10 rounded-xl mb-4"></div>
              <div className="w-20 h-4 bg-mono-accent/10 rounded"></div>
              <div className="w-12 h-8 bg-mono-accent/10 rounded mt-1"></div>
            </div>
          ))
        ) : errors.stats ? (
          <div className="col-span-1 md:col-span-5 bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-red-800">
            <p className="font-medium mb-2">{errors.stats}</p>
            <button onClick={() => fetchDashboard(true)} className="px-4 py-2 bg-white rounded-lg border border-red-200 text-sm font-medium hover:bg-red-50">Retry</button>
          </div>
        ) : stats && (
          <>
            <button onClick={() => navigateToFiltered('WAITING_FOR_CENTRE,ACCEPTED')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <p className="text-sm font-medium text-mono-muted mb-1">New Intake</p>
              <h3 className="text-3xl font-bold text-mono-text">{stats.new}</h3>
            </button>

            <button onClick={() => navigateToFiltered('UNDER_REVIEW,READY_FOR_PROCESSING,PROCESSING')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Clock size={24} />
              </div>
              <p className="text-sm font-medium text-mono-muted mb-1">In Progress</p>
              <h3 className="text-3xl font-bold text-mono-text">{stats.in_review}</h3>
            </button>

            <button onClick={() => navigateToFiltered('CORRECTION_REQUIRED,INTERACTION_REQUIRED,INTERACTION_SCHEDULED,PAYMENT_PENDING')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-medium text-mono-muted mb-1">Awaiting Citizen</p>
              <h3 className="text-3xl font-bold text-mono-text">{stats.awaiting_citizen}</h3>
            </button>

            <button onClick={() => navigateToFiltered('COMPLETED')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-medium text-mono-muted mb-1">Completed Today</p>
              <h3 className="text-3xl font-bold text-mono-text">{stats.completed_today}</h3>
            </button>

            <button onClick={() => navigateToFiltered('UNABLE_TO_PROCEED')} className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm hover:shadow-md transition-all text-left group">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-medium text-mono-muted mb-1">Rejected (30d)</p>
              <h3 className="text-3xl font-bold text-mono-text">{stats.rejected_last_30_days}</h3>
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
        <div className="bg-white rounded-2xl border border-mono-border shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-6 border-b border-mono-border flex justify-between items-center bg-mono-bg/30">
            <h2 className="text-lg font-bold text-mono-text flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              Needs Attention
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {loading.attention ? (
              <div className="space-y-2 p-2">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="w-full h-20 bg-mono-accent/5 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : errors.attention ? (
              <div className="text-center py-12 text-red-600">
                <p className="font-medium">{errors.attention}</p>
                <button onClick={() => fetchDashboard(true)} className="mt-2 text-sm underline hover:text-red-700">Retry</button>
              </div>
            ) : needsAttention?.length === 0 ? (
              <div className="text-center py-12 text-mono-muted">
                <FileCheck size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-mono-text">Queue is clear</p>
                <p className="text-sm mt-1">No requests currently need your attention.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {needsAttention?.map(req => {
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

        <div className="bg-white rounded-2xl border border-mono-border shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-6 border-b border-mono-border bg-mono-bg/30">
            <h2 className="text-lg font-bold text-mono-text flex items-center gap-2">
              <History size={20} className="text-indigo-500" />
              Recent Activity
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {loading.activity ? (
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-[5px] w-px bg-mono-accent/10"></div>
                <div className="space-y-6 pl-6">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 animate-pulse">
                      <div className="w-32 h-4 bg-mono-accent/10 rounded"></div>
                      <div className="w-48 h-3 bg-mono-accent/10 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : errors.activity ? (
              <div className="text-center py-12 text-red-600">
                <p className="font-medium">{errors.activity}</p>
                <button onClick={() => fetchDashboard(true)} className="mt-2 text-sm underline hover:text-red-700">Retry</button>
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="text-center py-12 text-mono-muted">
                <History size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-medium text-mono-text">No recent activity</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-[5px] w-px bg-mono-border"></div>
                <div className="space-y-4">
                  {recentActivity?.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="relative flex gap-3 group items-start">
                      <div className="relative z-10 flex-shrink-0 w-2.5 h-2.5 mt-1.5 rounded-full bg-mono-muted"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2 truncate">
                            <span className="font-medium text-sm text-mono-text capitalize truncate">
                              {activity.action.replace(/_/g, ' ').toLowerCase()}
                            </span>
                            <span className="text-xs text-mono-muted truncate">
                              {activity.request_service_name}
                            </span>
                          </div>
                          <time 
                            className="text-xs text-mono-muted flex-shrink-0 tabular-nums" 
                            title={new Date(activity.created_at).toLocaleString()}
                          >
                            {formatRelativeTime(activity.created_at)}
                          </time>
                        </div>
                        {activity.note && (
                          <p className="text-xs text-mono-muted mt-0.5 truncate">
                            {activity.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
