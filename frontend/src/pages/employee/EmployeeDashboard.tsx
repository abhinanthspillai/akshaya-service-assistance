import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  History,
  CheckCircle2,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { formatStatus, formatRelativeTime } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

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
        if (Array.isArray(res.data)) {
            setRecentActivity(res.data);
            setErrors(p => ({ ...p, activity: '' }));
        } else {
            console.error('Invalid activity data:', res.data);
            setRecentActivity([]);
            setErrors(p => ({ ...p, activity: '' }));
        }
      } catch (e: any) {
        console.error('Failed to load activity:', e);
        setRecentActivity([]);
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
    <div className="space-y-6 pb-12">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Avatar photoUrl={user?.photo_url} name={user?.full_name} className="w-12 h-12 text-xl shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-mono-text tracking-tight leading-tight">
              Welcome back, {user?.full_name || 'Employee'}
            </h1>
            <p className="text-[15px] font-medium text-mono-muted mt-0.5">
              Akshaya Centre Dashboard
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Button 
            onClick={() => fetchDashboard(true)} 
            variant="outline"
            icon={<RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading.stats ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} padding="md" className="animate-pulse">
              <div className="w-10 h-10 bg-mono-surface rounded-full mb-4"></div>
              <div className="w-16 h-8 bg-mono-surface rounded mb-2"></div>
              <div className="w-24 h-4 bg-mono-surface rounded"></div>
            </Card>
          ))
        ) : errors.stats ? (
          <div className="col-span-1 lg:col-span-4 bg-mono-surface/50 border border-mono-border rounded-xl p-6 flex flex-col items-center justify-center">
            <p className="font-medium text-mono-text mb-2">{errors.stats}</p>
            <Button onClick={() => fetchDashboard(true)} size="sm">Retry</Button>
          </div>
        ) : stats && (
          <>
            <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigateToFiltered('WAITING_FOR_CENTRE,ACCEPTED')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
                    <FileText size={20} />
                  </div>
                  <p className="text-[15px] font-semibold text-mono-text">New Intake</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-3xl font-bold text-mono-text">{stats.new}</span>
                  <p className="text-[13px] text-mono-muted mt-1">Awaiting acceptance</p>
                </div>
                <ChevronRight size={20} className="text-mono-muted" />
              </div>
            </Card>

            <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigateToFiltered('UNDER_REVIEW,READY_FOR_PROCESSING,PROCESSING')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
                    <Clock size={20} />
                  </div>
                  <p className="text-[15px] font-semibold text-mono-text">In Progress</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-3xl font-bold text-mono-text">{stats.in_review}</span>
                  <p className="text-[13px] text-mono-muted mt-1">Currently processing</p>
                </div>
                <ChevronRight size={20} className="text-mono-muted" />
              </div>
            </Card>

            <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigateToFiltered('CORRECTION_REQUIRED,INTERACTION_REQUIRED,INTERACTION_SCHEDULED,PAYMENT_PENDING')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
                    <AlertCircle size={20} />
                  </div>
                  <p className="text-[15px] font-semibold text-mono-text">Awaiting Citizen</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-3xl font-bold text-mono-text">{stats.awaiting_citizen}</span>
                  <p className="text-[13px] text-mono-muted mt-1">Needs action</p>
                </div>
                <ChevronRight size={20} className="text-mono-muted" />
              </div>
            </Card>

            <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigateToFiltered('COMPLETED')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
                    <CheckCircle size={20} />
                  </div>
                  <p className="text-[15px] font-semibold text-mono-text">Completed</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-3xl font-bold text-mono-text">{stats.completed_today}</span>
                  <p className="text-[13px] text-mono-muted mt-1">Resolved today</p>
                </div>
                <ChevronRight size={20} className="text-mono-muted" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Needs Attention) */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[18px] font-semibold text-mono-text">Needs Attention</h2>
              <button onClick={() => navigate('/employee/requests')} className="text-[14px] font-semibold text-mono-text flex items-center gap-1 hover:opacity-70 transition-opacity">
                View all <ArrowRight size={16} />
              </button>
            </div>

            {loading.attention ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="w-full h-20 bg-mono-surface animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : errors.attention ? (
              <div className="py-8 flex flex-col items-center justify-center border border-mono-border rounded-xl bg-mono-surface/30">
                <AlertCircle className="text-mono-text mb-2" size={24} strokeWidth={1.5} />
                <p className="text-mono-muted text-[13px] font-medium mb-3">Failed to load queue.</p>
                <Button onClick={() => fetchDashboard(true)} size="sm">Retry</Button>
              </div>
            ) : needsAttention?.length === 0 ? (
              <div className="py-8 border border-mono-border border-dashed rounded-xl bg-mono-surface/30">
                <EmptyState 
                  icon={<CheckCircle size={32} />} 
                  title="Queue is clear" 
                  description="No requests currently need your attention." 
                />
              </div>
            ) : (
              <div className="space-y-4">
                {needsAttention?.map(req => (
                  <button
                    key={req.id}
                    onClick={() => navigate(`/employee/requests/${req.id}`)}
                    className="w-full text-left border border-mono-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-mono-text/30 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
                        <AlertCircle size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-mono-text text-[15px] line-clamp-1">{req.service_name_snapshot}</h3>
                        <p className="text-[14px] text-mono-muted mt-0.5">#{req.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-[12px] text-mono-muted mt-2 flex items-center gap-1">
                          <Clock size={12} /> Updated {new Date(req.updated_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-mono-surface border border-mono-border text-mono-text">
                        {formatStatus(req.status)}
                      </span>
                      <ChevronRight size={20} className="text-mono-muted opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (Recent Activity) */}
        <div className="space-y-6">
          <Card padding="md">
            <h2 className="text-[18px] font-semibold text-mono-text mb-6">Recent Activity</h2>
            
            {loading.activity ? (
              <div className="space-y-6">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-2 h-2 mt-2 rounded-full bg-mono-surface shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="w-full h-4 bg-mono-surface rounded"></div>
                      <div className="w-2/3 h-3 bg-mono-surface rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : errors.activity ? (
              <div className="py-8 flex flex-col items-center justify-center border border-mono-border rounded-xl bg-mono-surface/30">
                <AlertCircle className="text-mono-text mb-2" size={24} strokeWidth={1.5} />
                <p className="text-mono-muted text-[13px] font-medium mb-3">Failed to load activity.</p>
                <Button onClick={() => fetchDashboard(true)} size="sm">Retry</Button>
              </div>
            ) : recentActivity?.length === 0 ? (
              <div className="py-8 border border-mono-border border-dashed rounded-xl bg-mono-surface/30">
                <EmptyState 
                  icon={<History size={32} />} 
                  title="No activity" 
                  description="Recent actions will appear here." 
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute top-2 bottom-2 left-[3px] w-px bg-mono-border"></div>
                <div className="space-y-6">
                  {recentActivity?.slice(0, 6).map((activity, i) => (
                    <div key={activity.id} className="relative flex gap-4 items-start">
                      <div className={`relative z-10 flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${i === 0 ? 'bg-mono-text' : 'bg-mono-muted'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <span className={`font-semibold text-[14px] ${i === 0 ? 'text-mono-text' : 'text-mono-text/80'} capitalize truncate`}>
                            {activity.action.replace(/_/g, ' ').toLowerCase()}
                          </span>
                          <span className="text-[13px] text-mono-muted truncate">
                            {activity.request_service_name} #{activity.request_id.substring(0, 8)}
                          </span>
                          <time className="text-[12px] text-mono-muted mt-1 tabular-nums font-medium">
                            {formatRelativeTime(activity.created_at)}
                          </time>
                        </div>
                        {activity.note && (
                          <p className="text-[13px] text-mono-muted mt-2 p-3 bg-mono-surface rounded-lg border border-mono-border truncate">
                            {activity.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
