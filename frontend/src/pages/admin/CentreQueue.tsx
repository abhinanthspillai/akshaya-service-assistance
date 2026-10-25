import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  Inbox,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  X,
  Clock,
} from 'lucide-react';
import { formatStatus } from '../../utils/format';
import clsx from 'clsx';

interface ServiceRequest {
  id: string;
  status: string;
  service_name_snapshot: string;
  service_type_snapshot?: string;
  fee_snapshot?: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  citizen_id: string;
}

interface EmployeeItem {
  user_id: string;
  full_name: string;
  email: string;
  is_available: boolean;
  is_active: boolean;
  active_requests_count: number;
  max_active_requests: number;
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

const FILTER_PILLS = [
  { id: 'ALL', label: 'All Requests' },
  { id: 'WAITING_FOR_CENTRE,ACCEPTED', label: 'New Intake' },
  { id: 'UNDER_REVIEW,READY_FOR_PROCESSING,PROCESSING', label: 'In Progress' },
  { id: 'CORRECTION_REQUIRED,INTERACTION_REQUIRED,INTERACTION_SCHEDULED,PAYMENT_PENDING', label: 'Awaiting Citizen' },
  { id: 'COMPLETED,CLOSED', label: 'Completed' },
];

export function CentreQueue() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterPill, setActiveFilterPill] = useState('ALL');

  // Reassign Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassigningRequest, setReassigningRequest] = useState<ServiceRequest | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const fetchQueueData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch centre requests
      const res = await api.get('/requests/?limit=100');
      setRequests(res.data?.items || []);
      setStatusCounts(res.data?.status_counts || {});

      // 2. Fetch centre employees
      try {
        const empRes = await api.get<EmployeeItem[]>('/staff/employees');
        setEmployees(empRes.data || []);
      } catch {
        setEmployees([]);
      }
    } catch {
      setError('Failed to load centre work queue.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, []);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningRequest || !targetEmployeeId) return;

    setIsSubmittingReassign(true);
    setReassignError(null);
    try {
      await api.post(`/requests/${reassigningRequest.id}/reassign`, {
        employee_id: targetEmployeeId,
      });

      setIsReassignModalOpen(false);
      setReassigningRequest(null);
      setTargetEmployeeId('');
      setSuccessMessage('Application successfully reassigned!');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchQueueData(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setReassignError(e.response?.data?.detail || 'Failed to reassign application.');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        req.service_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.citizen_id.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesPill = true;
      if (activeFilterPill !== 'ALL') {
        const allowed = activeFilterPill.split(',');
        matchesPill = allowed.includes(req.status);
      }

      return matchesSearch && matchesPill;
    });
  }, [requests, searchTerm, activeFilterPill]);

  const totalInQueue = requests.length;
  const newIntakeCount = (statusCounts['WAITING_FOR_CENTRE'] || 0) + (statusCounts['ACCEPTED'] || 0);
  const inProgressCount =
    (statusCounts['UNDER_REVIEW'] || 0) +
    (statusCounts['READY_FOR_PROCESSING'] || 0) +
    (statusCounts['PROCESSING'] || 0);
  const completedCount = (statusCounts['COMPLETED'] || 0) + (statusCounts['CLOSED'] || 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-mono-text rounded-[16px] flex items-center justify-center text-mono-bg">
            <Inbox size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-mono-text">Centre Application Work Queue</h1>
            <p className="text-mono-muted text-sm mt-0.5">
              Monitor, review, and reassign citizen service requests processed by this centre's operators
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchQueueData(true)}
          disabled={isRefreshing}
          className="p-2.5 rounded-xl border border-mono-border text-mono-text hover:bg-mono-surface transition-colors flex items-center gap-2 text-sm font-medium self-start sm:self-auto"
        >
          <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Total in Centre</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{totalInQueue}</p>
          <p className="text-xs text-mono-muted mt-1">All lifecycle stages</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">New Intake</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600">{newIntakeCount}</p>
          </div>
          <p className="text-xs text-mono-muted mt-1">Waiting for triage</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">In Progress</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{inProgressCount}</p>
          <p className="text-xs text-mono-muted mt-1">Under review / processing</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Completed</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{completedCount}</p>
          <p className="text-xs text-mono-muted mt-1">Delivered to citizens</p>
        </div>
      </div>

      {/* Search and Filter Pills */}
      <div className="bg-white p-4 rounded-2xl border border-mono-border shadow-sm space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mono-muted" />
          <input
            type="text"
            placeholder="Search by service name, request ID, or citizen ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-mono-text text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20 focus:border-mono-text"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilterPill === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveFilterPill(pill.id)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-mono-text text-mono-bg shadow-sm'
                    : 'bg-mono-surface text-mono-muted hover:text-mono-text hover:bg-mono-border/50'
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-mono-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-mono-muted">
            <Loader2 className="animate-spin text-mono-text mb-3" size={36} />
            <p className="text-sm">Loading centre applications...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-mono-muted">
            <Inbox size={40} className="mx-auto text-mono-muted/40 mb-3" />
            <p className="text-base font-semibold text-mono-text">No applications found</p>
            <p className="text-xs text-mono-muted mt-1">
              {searchTerm || activeFilterPill !== 'ALL'
                ? 'Try clearing search filters.'
                : 'There are currently no citizen applications in this centre queue.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-mono-text">
              <thead className="bg-mono-surface border-b border-mono-border text-xs uppercase font-bold text-mono-muted tracking-wider">
                <tr>
                  <th className="px-6 py-4">Application</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4">Citizen Ref</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mono-border">
                {filteredRequests.map((req) => {
                  const badge = STATUS_BADGES[req.status] || {
                    bg: 'bg-mono-surface',
                    text: 'text-mono-text',
                    border: 'border-mono-border',
                  };

                  const canReassign = ![
                    'DRAFT',
                    'SUBMITTED',
                    'WAITING_FOR_CENTRE',
                    'COMPLETED',
                    'CLOSED',
                    'CANCELLED',
                    'UNABLE_TO_PROCEED',
                  ].includes(req.status);

                  return (
                    <tr key={req.id} className="hover:bg-mono-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-mono-text">{req.service_name_snapshot}</p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-mono-surface text-mono-muted text-xs font-mono font-medium">
                          {req.id.substring(0, 8)}...
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            'inline-block px-2.5 py-1 rounded-full text-xs font-semibold border',
                            badge.bg,
                            badge.text,
                            badge.border
                          )}
                        >
                          {formatStatus(req.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-mono-muted whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} />
                          <span>{new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-mono-muted">
                        {req.citizen_id.substring(0, 8)}...
                      </td>

                      <td className="px-6 py-4 text-right">
                        {canReassign ? (
                          <button
                            onClick={() => {
                              setReassigningRequest(req);
                              setTargetEmployeeId(employees[0]?.user_id || '');
                              setReassignError(null);
                              setIsReassignModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mono-border text-mono-text hover:bg-mono-surface font-semibold text-xs transition-colors"
                          >
                            <UserCheck size={14} />
                            Reassign
                          </button>
                        ) : (
                          <span className="text-xs text-mono-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Reassign Request */}
      {isReassignModalOpen && reassigningRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-mono-text">Reassign Application</h3>
                  <p className="text-xs text-mono-muted">{reassigningRequest.service_name_snapshot}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="text-mono-muted hover:text-mono-text p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReassign} className="p-6 space-y-4">
              {reassignError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{reassignError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Select Target Operator *
                </label>
                <select
                  required
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                >
                  <option value="" disabled>
                    Choose an operator...
                  </option>
                  {employees
                    .filter((e) => e.is_active)
                    .map((emp) => (
                      <option key={emp.user_id} value={emp.user_id}>
                        {emp.full_name} ({emp.active_requests_count} / {emp.max_active_requests} active)
                        {!emp.is_available ? ' - [Offline]' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-mono-muted mt-1.5">
                  Only active operators from this centre are listed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-mono-border">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-mono-border text-mono-text text-sm font-semibold hover:bg-mono-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReassign || !targetEmployeeId}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isSubmittingReassign && <Loader2 size={16} className="animate-spin" />}
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
