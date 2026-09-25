import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Loader2,
  FileText,
  Users,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ArrowUpRight,
  History,
  FileCheck,
  CreditCard,
  Calendar,
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

export function Queue() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<'attention' | 'all' | 'activity'>('attention');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // "All Requests" tab states
  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    try {
      const res = await api.get('/requests/dashboard');
      setDashboard(res.data);
      setError('');
    } catch {
      setError('Failed to load centre dashboard and queue.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchAllRequests = useCallback(async () => {
    setLoadingAll(true);
    try {
      let url = '/requests/?limit=50';
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await api.get(url);
      const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
      // Filter out drafts as they are citizen-only
      setAllRequests(items.filter((r: ServiceRequest) => r.status !== 'DRAFT'));
    } catch {
      // non-fatal
    } finally {
      setLoadingAll(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllRequests();
    }
  }, [activeTab, fetchAllRequests]);

  const handleManualRefresh = () => {
    fetchDashboard(true);
    if (activeTab === 'all') {
      fetchAllRequests();
    }
  };

  const getPriorityReason = (req: ServiceRequest, index: number) => {
    if (req.status === 'UNDER_REVIEW' || req.status === 'CORRECTION_REQUIRED') {
      return {
        label: 'Awaiting Document Review',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    }
    if (req.status === 'WAITING_FOR_CENTRE') {
      return {
        label: 'New - Needs Acceptance',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    if (req.status === 'READY_FOR_PROCESSING') {
      return {
        label: 'Ready for Processing',
        color: 'bg-teal-50 text-teal-700 border-teal-200',
      };
    }
    if (req.status === 'PROCESSING') {
      return {
        label: 'Active Processing',
        color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      };
    }
    if (req.status === 'ACCEPTED') {
      return {
        label: 'Accepted - Start Review',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    return {
      label: `Queue Priority #${index + 1}`,
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <Loader2 className="animate-spin text-slate-800" size={36} />
        <span className="text-sm font-medium text-slate-500">Loading Centre Queue...</span>
      </div>
    );
  }

  const buckets = dashboard?.buckets || {
    new: 0,
    in_review: 0,
    awaiting_citizen: 0,
    completed_today: 0,
    rejected_last_30_days: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users size={26} className="text-slate-800" />
              Akshaya Centre Request Queue
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time citizen intake, document verification, and application delivery pipeline.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Queue'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Metric 1: New / Intake */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">New Intake</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle size={15} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{buckets.new}</span>
            <span className="text-xs text-slate-400">waiting</span>
          </div>
        </div>

        {/* Metric 2: Under Review & Processing */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileCheck size={15} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{buckets.in_review}</span>
            <span className="text-xs text-slate-400">review / proc</span>
          </div>
        </div>

        {/* Metric 3: Awaiting Citizen */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Citizen</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Clock size={15} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{buckets.awaiting_citizen}</span>
            <span className="text-xs text-slate-400">action required</span>
          </div>
        </div>

        {/* Metric 4: Completed Today */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Today</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={15} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{buckets.completed_today}</span>
            <span className="text-xs text-emerald-600/70">delivered</span>
          </div>
        </div>

        {/* Metric 5: Rejected (30d) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rejected (30d)</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <XCircle size={15} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{buckets.rejected_last_30_days}</span>
            <span className="text-xs text-slate-400">unable to proceed</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('attention')}
            className={`pb-3.5 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
              activeTab === 'attention'
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={16} className={activeTab === 'attention' ? 'text-indigo-600' : ''} />
            Needs Attention
            {dashboard?.needs_attention && dashboard.needs_attention.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                {dashboard.needs_attention.length}
              </span>
            )}
            {activeTab === 'attention' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3.5 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
              activeTab === 'all'
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Filter size={16} />
            All Centre Requests
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3.5 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
              activeTab === 'activity'
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={16} />
            Recent Activity
            {activeTab === 'activity' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Needs Attention (Strictly Server-Side Order) */}
      {activeTab === 'attention' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Ranked in priority order by server: Re-uploaded docs &gt; Oldest unassigned &gt; Oldest untouched
            </span>
            <span>Showing top {dashboard?.needs_attention.length || 0} items</span>
          </div>

          {!dashboard?.needs_attention || dashboard.needs_attention.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={44} />
              <h3 className="text-base font-bold text-slate-900 mb-1">Queue is Up to Date</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No items currently require urgent attention. Check &quot;All Centre Requests&quot; for complete archives.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {dashboard.needs_attention.map((req, idx) => {
                const badge = STATUS_BADGES[req.status] || {
                  bg: 'bg-slate-100',
                  text: 'text-slate-700',
                  border: 'border-slate-200',
                };
                const priority = getPriorityReason(req, idx);

                return (
                  <div
                    key={req.id}
                    onClick={() => navigate('/employee/requests/' + req.id)}
                    className="group bg-white rounded-2xl border border-slate-200/90 p-4.5 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Priority Rank Number */}
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                        #{idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {req.service_name_snapshot}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {formatStatus(req.status)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priority.color}`}
                          >
                            {priority.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>Ref: <span className="font-mono text-slate-700">{req.id.slice(0, 8)}</span></span>
                          <span>•</span>
                          <span>Service Type {req.service_type_snapshot}</span>
                          <span>•</span>
                          <span>Fee: {req.fee_snapshot ? `₹${req.fee_snapshot}` : 'Free'}</span>
                          <span>•</span>
                          <span>Submitted: {new Date(req.submitted_at || req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 group-hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-all shadow-sm">
                        Open Workspace
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Requests Filterable Stream */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by request ID or service name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-xs border border-transparent focus:bg-white focus:border-slate-300 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 outline-none"
              >
                <option value="ALL">All Active Statuses</option>
                <option value="WAITING_FOR_CENTRE">Waiting for Centre</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CORRECTION_REQUIRED">Correction Required</option>
                <option value="READY_FOR_PROCESSING">Ready for Processing</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAYMENT_PENDING">Payment Pending</option>
                <option value="INTERACTION_REQUIRED">Interaction Required</option>
                <option value="INTERACTION_SCHEDULED">Interaction Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="UNABLE_TO_PROCEED">Unable to Proceed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {loadingAll ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin text-slate-800" size={28} />
            </div>
          ) : allRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <FileText className="mx-auto text-slate-400 mb-3" size={40} />
              <h3 className="text-base font-bold text-slate-900 mb-1">No requests found</h3>
              <p className="text-sm text-slate-500">
                Try changing your search query or status filter.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <ul className="divide-y divide-slate-100">
                {allRequests.map((req) => {
                  const badge = STATUS_BADGES[req.status] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  };

                  return (
                    <li key={req.id}>
                      <button
                        onClick={() => navigate('/employee/requests/' + req.id)}
                        className="w-full flex items-center justify-between p-4.5 hover:bg-slate-50/80 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-center gap-2.5 mb-1">
                            <span className="font-bold text-sm text-slate-900 truncate">
                              {req.service_name_snapshot}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {formatStatus(req.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>ID: <span className="font-mono text-slate-700">{req.id.slice(0, 8)}</span></span>
                            <span>•</span>
                            <span>Type {req.service_type_snapshot}</span>
                            <span>•</span>
                            <span>{req.fee_snapshot ? `₹${req.fee_snapshot}` : 'Free'}</span>
                            <span>•</span>
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Workspace</span>
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Recent Centre Activity Log */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Recent Workflow Transitions &amp; Actions
          </h3>

          {!dashboard?.recent_activity || dashboard.recent_activity.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {dashboard.recent_activity.map((item, itemIdx) => {
                  const isLast = itemIdx === dashboard.recent_activity.length - 1;
                  return (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center ring-8 ring-white">
                              <History size={14} />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-xs text-slate-800">
                                Action <span className="font-semibold text-slate-900">{item.action}</span> on{' '}
                                <strong className="font-medium text-slate-900">
                                  {item.request_service_name}
                                </strong>
                              </p>
                              {item.note && (
                                <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  &quot;{item.note}&quot;
                                </p>
                              )}
                            </div>
                            <div className="whitespace-nowrap text-right text-xs text-slate-400">
                              <time dateTime={item.created_at}>
                                {new Date(item.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
