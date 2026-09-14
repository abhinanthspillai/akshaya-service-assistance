import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Loader2, Shield, Activity } from 'lucide-react';

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_resource_type: string;
  target_resource_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit/');
        setLogs(res.data);
      } catch {
        setError('Failed to load audit logs.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
          <Shield className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">Review system activity and administrative actions</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Resource</th>
                <th className="px-6 py-4 font-semibold">Actor ID</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Activity className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    No audit logs available.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4">
                      {log.target_resource_type}
                      {log.target_resource_id && (
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{log.target_resource_id.substring(0, 8)}...</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.actor_id ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {log.actor_id.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.details ? (
                        <pre className="text-xs text-slate-500 bg-slate-50 p-2 rounded overflow-x-auto max-w-xs border border-slate-100">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
