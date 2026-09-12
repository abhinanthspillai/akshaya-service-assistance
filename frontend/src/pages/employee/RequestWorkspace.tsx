
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, Clock } from 'lucide-react';

interface ServiceRequest {
  id: string;
  status: string;
  service_name_snapshot: string;
  service_type_snapshot: string;
  fee_snapshot: number | null;
  submitted_at: string | null;
  created_at: string;
}

interface RequestHistory {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-blue-50 text-blue-700',
  WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800',
  ACCEPTED: 'bg-indigo-50 text-indigo-700',
  UNDER_REVIEW: 'bg-purple-50 text-purple-700',
};

export function RequestWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reqRes, histRes] = await Promise.all([
          api.get('/requests/' + id),
          api.get('/requests/' + id + '/history')
        ]);
        setRequest(reqRes.data);
        setHistory(histRes.data);
      } catch {
        setError('Failed to load request workspace.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleAccept = async () => {
    if (!request) return;
    setIsAccepting(true);
    try {
      const res = await api.post('/requests/' + request.id + '/accept');
      setRequest(res.data);
      const histRes = await api.get('/requests/' + request.id + '/history');
      setHistory(histRes.data);
    } catch (e) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to accept request.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
        {error || 'Request not found.'}
      </div>
    );
  }

  const statusColor = STATUS_COLORS[request.status] || 'bg-slate-100 text-slate-600';

  return (
    <div>
      <button
        onClick={() => navigate('/queue')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Queue
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={('px-3 py-1 rounded-full text-sm font-medium ' + statusColor)}>
                {request.status.replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-slate-400">Type {request.service_type_snapshot}</span>
            </div>
            {request.status === 'WAITING_FOR_CENTRE' && (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isAccepting ? 'Accepting...' : 'Accept Request'}
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-indigo-950 mb-2">{request.service_name_snapshot}</h1>
          <div className="text-slate-500 text-sm">
            Created {new Date(request.created_at).toLocaleDateString()}
          </div>
        </div>

        {error && (
          <div className="mx-8 mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
            {error}
          </div>
        )}

        <div className="p-8">
          <h2 className="text-lg font-semibold text-indigo-950 mb-6 flex items-center gap-2">
            <Clock size={20} className="text-indigo-600" />
            Request History
          </h2>
          
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">No history recorded yet.</p>
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-3 space-y-6">
              {history.map((item) => (
                <div key={item.id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-400"></div>
                  <div className="font-medium text-slate-900 capitalize">{item.action}</div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {new Date(item.created_at).toLocaleString()}
                    {item.to_status && ' · Changed to ' + item.to_status.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
