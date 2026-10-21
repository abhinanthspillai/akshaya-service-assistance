import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export interface AccountRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  centre_id: string;
  centre_name: string;
  centre_code: string;
  approval_status: string;
  created_at: string;
}

interface AccountRequestsSectionProps {
  title?: string;
  onUpdateBadge?: (count: number) => void;
}

export function AccountRequestsSection({
  title = 'Pending Account Requests',
  onUpdateBadge,
}: AccountRequestsSectionProps) {
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingRequest, setRejectingRequest] = useState<AccountRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<AccountRequest[]>('/staff/account-requests');
      setRequests(res.data);
      if (onUpdateBadge) {
        onUpdateBadge(res.data.length);
      }
    } catch {
      setError('Failed to load pending account requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (req: AccountRequest) => {
    setProcessingId(req.user_id);
    try {
      await api.post(`/staff/account-requests/${req.user_id}/approve`);
      const updated = requests.filter((r) => r.user_id !== req.user_id);
      setRequests(updated);
      if (onUpdateBadge) {
        onUpdateBadge(updated.length);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to approve account request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsSubmittingReject(true);
    try {
      await api.post(`/staff/account-requests/${rejectingRequest.user_id}/reject`, {
        reason: rejectReason.trim() || undefined,
      });
      const updated = requests.filter((r) => r.user_id !== rejectingRequest.user_id);
      setRequests(updated);
      if (onUpdateBadge) {
        onUpdateBadge(updated.length);
      }
      setRejectingRequest(null);
      setRejectReason('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to reject account request.');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  return (
    <div className="bg-white rounded-[16px] border border-mono-border shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mono-surface border border-mono-border flex items-center justify-center text-mono-text">
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-mono-text flex items-center gap-2">
              {title}
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-mono-surface border border-mono-border text-mono-text">
                {requests.length}
              </span>
            </h2>
            <p className="text-xs text-mono-muted mt-0.5">
              Review and authorize access for Centre Staff and Centre Administrators
            </p>
          </div>
        </div>
        <button
          onClick={fetchRequests}
          disabled={isLoading}
          className="text-xs text-mono-muted hover:text-mono-text transition-colors font-medium"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-mono-muted">
          <Loader2 size={24} className="animate-spin mb-2" />
          <span className="text-xs">Loading requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-mono-border rounded-xl">
          <ShieldCheck size={28} className="mx-auto text-mono-muted mb-2 opacity-60" />
          <p className="text-sm font-semibold text-mono-text">No pending account requests</p>
          <p className="text-xs text-mono-muted mt-1">All registrations have been processed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-mono-border text-mono-muted font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Applicant Name</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Requested Role</th>
                <th className="py-3 px-3">Centre</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mono-border">
              {requests.map((req) => (
                <tr key={req.user_id} className="hover:bg-mono-surface/50 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-mono-text">{req.full_name}</td>
                  <td className="py-3.5 px-3 text-mono-muted">{req.email}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        req.role === 'centre_administrator'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {req.role === 'centre_administrator' ? 'Centre Manager' : 'Centre Staff'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-mono-text font-medium">
                    {req.centre_name} <span className="text-mono-muted font-normal">({req.centre_code})</span>
                  </td>
                  <td className="py-3.5 px-3 text-mono-muted">
                    {new Date(req.created_at).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={processingId === req.user_id}
                        className="px-3 py-1.5 rounded-lg bg-mono-text text-mono-bg hover:bg-black font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {processingId === req.user_id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectReason('');
                        }}
                        disabled={processingId === req.user_id}
                        className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-md w-full p-6 text-mono-text">
            <h3 className="text-lg font-bold mb-1">Reject Account Request</h3>
            <p className="text-xs text-mono-muted mb-4 leading-relaxed">
              Are you sure you want to reject registration for{' '}
              <strong className="text-mono-text">{rejectingRequest.full_name}</strong> (
              {rejectingRequest.email})?
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1 text-mono-text">
                Reason for Rejection <span className="text-mono-muted font-normal">(Optional)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Centre already at staff capacity or unrecognized applicant"
                rows={3}
                className="w-full p-2.5 bg-mono-surface border border-mono-border rounded-xl text-xs text-mono-text focus:outline-none focus:border-mono-text transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-mono-border">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                disabled={isSubmittingReject}
                className="px-4 py-2 rounded-xl text-xs font-medium text-mono-muted hover:text-mono-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReject && <Loader2 size={13} className="animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
