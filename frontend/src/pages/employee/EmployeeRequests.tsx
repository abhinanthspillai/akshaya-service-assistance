import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Loader2,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  RefreshCw
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

interface PaginatedRequests {
  items: ServiceRequest[];
  total: number;
  page: number;
  pages: number;
  status_counts: Record<string, number>;
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
  { id: 'CANCELLED,UNABLE_TO_PROCEED', label: 'Closed / Rejected' },
];

export function EmployeeRequests() {
  const [requestsData, setRequestsData] = useState<PaginatedRequests | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialStatus = searchParams.get('status') || 'ALL';
  
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const res = await api.get(`/requests/?${params.toString()}`);
      setRequestsData(res.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-mono-text tracking-tight">Akshaya Centre Requests</h1>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-mono-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-mono-border bg-mono-bg/30">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto snap-x hide-scrollbar">
              {FILTER_PILLS.map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap snap-start shrink-0 ${
                    statusFilter === pill.id
                      ? 'bg-mono-text text-white shadow-md'
                      : 'bg-white border border-mono-border text-mono-muted hover:border-mono-text/30 hover:text-mono-text'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted" size={18} />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-mono-border rounded-xl focus:ring-2 focus:ring-mono-text focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-mono-text" size={32} />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={32} />
            <p className="text-red-700">{error}</p>
          </div>
        ) : !requestsData?.items?.length ? (
          <div className="text-center py-24 text-mono-muted">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium text-mono-text">No requests found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-mono-border bg-mono-bg/50">
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-mono-muted">ID</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-mono-muted">Service</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-mono-muted">Status</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-mono-muted hidden md:table-cell">Submitted</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-mono-muted text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mono-border/50">
                {requestsData.items.map((req) => {
                  const badge = STATUS_BADGES[req.status] || STATUS_BADGES['WAITING_FOR_CENTRE'];
                  return (
                    <tr 
                      key={req.id} 
                      className="group hover:bg-mono-accent/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/employee/requests/${req.id}`)}
                    >
                      <td className="p-4">
                        <span className="font-mono text-sm font-semibold text-mono-text/80">{req.id.split('-')[0].toUpperCase()}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-mono-text">{req.service_name_snapshot}</p>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {formatStatus(req.status)}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell text-sm text-mono-muted">
                        {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="w-8 h-8 rounded-full bg-white border border-mono-border flex items-center justify-center ml-auto group-hover:border-mono-text/30 group-hover:text-mono-text text-mono-muted transition-all shadow-sm">
                          <ChevronRight size={16} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {requestsData && requestsData.pages > 1 && (
          <div className="p-4 border-t border-mono-border flex items-center justify-between bg-mono-bg/30">
            <p className="text-sm text-mono-muted font-medium">
              Showing <span className="text-mono-text font-bold">{requestsData.items.length}</span> of <span className="text-mono-text font-bold">{requestsData.total}</span> requests
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-mono-border bg-white text-mono-text disabled:opacity-50 hover:bg-mono-accent/5 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(requestsData.pages, p + 1))}
                disabled={page === requestsData.pages}
                className="p-2 rounded-lg border border-mono-border bg-white text-mono-text disabled:opacity-50 hover:bg-mono-accent/5 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
