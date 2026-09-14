import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Loader2, AlertTriangle, UserCheck } from 'lucide-react';

interface Escalation {
  id: string;
  request_id: string;
  reason: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

interface ServiceRequest {
  id: string;
  service_name_snapshot: string;
  status: string;
}

interface Employee {
  id: string;
  full_name: string;
  is_available: boolean;
  max_active_requests: number;
}

export function Escalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [requests, setRequests] = useState<Record<string, ServiceRequest>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/escalations?is_resolved=false');
        setEscalations(res.data);
        
        // Fetch request details for each escalation
        const requestData: Record<string, ServiceRequest> = {};
        for (const esc of res.data) {
          if (!requestData[esc.request_id]) {
            try {
              const reqRes = await api.get('/requests/' + esc.request_id);
              requestData[esc.request_id] = reqRes.data;
            } catch {
              // ignore
            }
          }
        }
        setRequests(requestData);

        // Try fetching employees (assuming an endpoint exists)
        try {
          const empRes = await api.get('/employees'); // or however we list them
          setEmployees(empRes.data);
        } catch {
          // If no such endpoint, we might just use a generic approach or we need to add it.
        }

      } catch {
        setError('Failed to load escalations.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDetect = async () => {
    setIsLoading(true);
    try {
      await api.post('/escalations/detect');
      const res = await api.get('/escalations?is_resolved=false');
      setEscalations(res.data);
    } catch {
      setError('Failed to detect stale requests.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassign = async (requestId: string, escalationId: string) => {
    const employeeId = selectedEmployee[requestId];
    if (!employeeId) return;

    setIsProcessing(escalationId);
    try {
      await api.post('/requests/' + requestId + '/reassign', { employee_id: employeeId });
      await api.post('/escalations/' + escalationId + '/resolve');
      setEscalations(escalations.filter(e => e.id !== escalationId));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reassign request.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResolve = async (escalationId: string) => {
    setIsProcessing(escalationId);
    try {
      await api.post('/escalations/' + escalationId + '/resolve');
      setEscalations(escalations.filter(e => e.id !== escalationId));
    } catch {
      setError('Failed to resolve escalation.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading && escalations.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-red-500" />
            Escalations
          </h1>
          <p className="text-slate-500 mt-2">Manage stale or unaccepted requests</p>
        </div>
        <button
          onClick={handleDetect}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Run Detection
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {escalations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No active escalations</h3>
          <p className="text-slate-500">All requests are being processed on time.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {escalations.map((esc) => {
            const req = requests[esc.request_id];
            return (
              <div key={esc.id} className="bg-white rounded-xl border border-red-200 shadow-sm p-6 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {req ? req.service_name_snapshot : 'Unknown Request'}
                    </h3>
                    <p className="text-sm text-red-600 mt-1">{esc.reason}</p>
                    <div className="text-xs text-slate-500 mt-2">
                      Escalated on: {new Date(esc.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Employee ID"
                        value={selectedEmployee[esc.request_id] || ''}
                        onChange={(e) => setSelectedEmployee({ ...selectedEmployee, [esc.request_id]: e.target.value })}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReassign(esc.request_id, esc.id)}
                        disabled={!selectedEmployee[esc.request_id] || isProcessing === esc.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isProcessing === esc.id ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                        Reassign
                      </button>
                      <button
                        onClick={() => handleResolve(esc.id)}
                        disabled={isProcessing === esc.id}
                        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
