import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, MapPin } from 'lucide-react';

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
};

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [centres, setCentres] = useState<Array<{ id: string; name: string; district: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/requests/' + (id || ''));
        setRequest(res.data);
        if (res.data.status === 'DRAFT' && res.data.service_id) {
          const centresRes = await api.get('/centres/?active=true');
          setCentres(centresRes.data);
        }
      } catch {
        setError('Failed to load request details.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleSelectCentre = async (centreId: string) => {
    if (!request) return;
    try {
      const res = await api.post('/requests/' + request.id + '/select-centre', { centre_id: centreId });
      setRequest(res.data);
    } catch {
      setError('Failed to select centre.');
    }
  };

  const handleSubmit = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/requests/' + request.id + '/submit');
      setRequest(res.data);
    } catch {
      setError('Cannot submit. Ensure a centre is selected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">{error}</div>
    );
  }

  if (!request) return null;

  const statusColor = STATUS_COLORS[request.status] || 'bg-slate-100 text-slate-600';

  return (
    <div>
      <button
        onClick={() => navigate('/requests')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Requests
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-purple-50/50 to-white">
          <div className="flex items-center gap-3 mb-4">
            <span className={('px-3 py-1 rounded-full text-sm font-medium ' + statusColor)}>
              {request.status.replace(/_/g, ' ')}
            </span>
            <span className="text-sm text-slate-400">Type {request.service_type_snapshot}</span>
          </div>
          <h1 className="text-2xl font-bold text-indigo-950 mb-2">{request.service_name_snapshot}</h1>
          <div className="text-slate-500 text-sm">
            Created {new Date(request.created_at).toLocaleDateString()}
            {request.submitted_at && ' · Submitted ' + new Date(request.submitted_at).toLocaleDateString()}
          </div>
          {request.fee_snapshot && (
            <div className="mt-4 text-lg font-semibold text-slate-900">
              Fee: Rs {request.fee_snapshot}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-8 mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
            {error}
          </div>
        )}

        {request.status === 'DRAFT' && (
          <div className="p-8">
            <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-purple-600" />
              Select a Centre
            </h2>

            {centres.length === 0 ? (
              <p className="text-slate-500 text-sm">No centres available for this service.</p>
            ) : (
              <div className="grid gap-3">
                {centres.map((centre) => (
                  <button
                    key={centre.id}
                    onClick={() => handleSelectCentre(centre.id)}
                    className={('w-full text-left p-4 rounded-xl border-2 transition-all ' + (request.selected_centre_id === centre.id ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200 bg-white'))}
                  >
                    <div className="font-semibold text-slate-900">{centre.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{centre.district}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!request.selected_centre_id || isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}

        {request.status !== 'DRAFT' && (
          <div className="p-8">
            <div className="text-slate-500 text-sm">
              Your request has been submitted and is being processed.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
