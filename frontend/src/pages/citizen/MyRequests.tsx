import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, FileText, ChevronRight } from 'lucide-react';

interface ServiceRequest {
  id: string;
  status: string;
  service_name_snapshot: string;
  service_type_snapshot: string;
  fee_snapshot: number | null;
  submitted_at: string | null;
  created_at: string;
  selected_centre_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800',
  ACCEPTED: 'bg-indigo-50 text-indigo-700',
  UNDER_REVIEW: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-green-50 text-green-800',
  CANCELLED: 'bg-red-50 text-red-700',
  UNABLE_TO_PROCEED: 'bg-red-100 text-red-800',
};

export function MyRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests/');
        setRequests(res.data);
      } catch {
        setError('Failed to load requests. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950">My Requests</h1>
          <p className="text-slate-500 mt-1">Track your service requests</p>
        </div>
        <button
          onClick={() => navigate('/services')}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          + New Request
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-100">{error}</div>
      )}

      {requests.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
          <FileText className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No requests yet</h3>
          <p className="text-slate-500 mb-6">You haven't created any service requests yet.</p>
          <button
            onClick={() => navigate('/services')}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Browse Services
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {requests.map((req) => (
              <li key={req.id}>
                <button
                  onClick={() => navigate('/requests/' + req.id)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-slate-900 truncate">{req.service_name_snapshot}</span>
                      <span className={('px-2 py-0.5 rounded-full text-xs font-medium ' + (STATUS_COLORS[req.status] || 'bg-slate-100 text-slate-600'))}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      Type {req.service_type_snapshot}
                      {req.fee_snapshot ? ' · ' + 'Rs ' + req.fee_snapshot : ' · Free'}
                      {' · '}{new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight className="text-slate-400 flex-shrink-0" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
