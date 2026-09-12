import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, AlertCircle, Clock, CheckCircle2, FileText, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ServiceRequest {
  id: string;
  status: string;
  service_id: string;
  service_name_snapshot: string;
  service_type_snapshot: string;
  fee_snapshot: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  selected_centre_id: string | null;
}

interface RequestHistory {
  id: string;
  action: string;
  from_status: string;
  to_status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  ACCEPTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  UNABLE_TO_PROCEED: 'bg-red-100 text-red-800 border-red-200',
  CORRECTION_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-200',
  INTERACTION_REQUIRED: 'bg-orange-50 text-orange-800 border-orange-200',
  PAYMENT_PENDING: 'bg-pink-50 text-pink-800 border-pink-200'
};

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, historyRes] = await Promise.all([
          api.get(`/requests/${id || ''}`),
          api.get(`/requests/${id || ''}/history`).catch(() => ({ data: [] }))
        ]);
        setRequest(res.data);
        setHistory(historyRes.data);
      } catch {
        setError('Failed to load request details.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3">
        <AlertCircle size={20} className="shrink-0" />
        {error}
      </div>
    );
  }

  if (!request) return null;

  const statusColor = STATUS_COLORS[request.status] || 'bg-slate-100 text-slate-700 border-slate-200';
  
  const needsAttention = ['CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'PAYMENT_PENDING'].includes(request.status);
  const isCompleted = ['COMPLETED', 'CLOSED'].includes(request.status);
  const isDraft = request.status === 'DRAFT';

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/requests')}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Requests
      </button>

      {/* Next Action Banner */}
      {needsAttention && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Action Required</h3>
              <p className="text-amber-800 text-sm">
                {request.status === 'CORRECTION_REQUIRED' && 'There is an issue with your submitted documents. Please visit the centre or check messages for details.'}
                {request.status === 'INTERACTION_REQUIRED' && 'You need to physically visit the Akshaya Centre for verification or biometrics.'}
                {request.status === 'PAYMENT_PENDING' && 'Please complete the payment for this service to proceed.'}
              </p>
            </div>
          </div>
          {/* Action buttons would go here in future phases */}
        </div>
      )}

      {isDraft && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <FileText className="text-slate-500 shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Draft Request</h3>
              <p className="text-slate-600 text-sm">This request was started but not submitted.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Detail Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white relative">
              <div className="flex items-center gap-3 mb-4">
                <span className={clsx('px-3 py-1 rounded-md text-xs font-bold border uppercase tracking-wider', statusColor)}>
                  {request.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white px-2 py-1 rounded-md border border-slate-200">
                  Type {request.service_type_snapshot}
                </span>
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{request.service_name_snapshot}</h1>
              <div className="text-slate-500 text-sm flex items-center gap-2">
                <Clock size={14} />
                Created {new Date(request.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Service Fee</div>
                <div className="font-medium text-slate-900">
                  {request.fee_snapshot ? `₹${request.fee_snapshot}` : 'Free'}
                </div>
              </div>
              
              {request.submitted_at && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Submitted On</div>
                  <div className="font-medium text-slate-900">
                    {new Date(request.submitted_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline / History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Request Timeline</h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {/* Initial created step */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                  <FileText size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm">Request Started</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(request.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {history.map((entry, idx) => {
                const isLatest = idx === history.length - 1;
                return (
                  <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={clsx(
                      "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10",
                      isLatest && !isCompleted ? "bg-indigo-100 text-indigo-600" :
                      isLatest && isCompleted ? "bg-emerald-100 text-emerald-600" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {isLatest && isCompleted ? <CheckCircle2 size={16} /> : <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-900 text-sm capitalize">{entry.action.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="text-xs text-slate-700 font-medium mb-1">
                        <span className="text-slate-400">Changed to</span> {entry.to_status.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {history.length === 0 && !isDraft && (
              <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl mt-4">
                No history recorded yet for this request.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Support & Help</h3>
            <p className="text-sm text-slate-500 mb-4">
              Need assistance with this request? Contact your assigned Akshaya Centre or raise a support ticket.
            </p>
            <button 
              onClick={() => navigate('/support')}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              Get Support <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
