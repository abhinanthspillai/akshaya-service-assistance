import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, FileText, Users, ChevronRight } from 'lucide-react';
import { formatStatus } from '../../utils/format';

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
 SUBMITTED: 'bg-accent-50 text-blue-600',
 WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800',
 ACCEPTED: 'bg-blue-600/10 text-mono-text',
 UNDER_REVIEW: 'bg-purple-50 text-purple-700',
 COMPLETED: 'bg-green-50 text-green-800',
 CANCELLED: 'bg-red-600/10 text-red-600',
};

export function Queue() {
 const [requests, setRequests] = useState<ServiceRequest[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');
 const navigate = useNavigate();
 

 useEffect(() => {
 const fetchRequests = async () => {
 try {
 const res = await api.get('/requests/');
 // Filter out drafts since employees shouldn't care about citizen drafts
 setRequests(res.data.filter((r: ServiceRequest) => r.status !== 'DRAFT'));
 } catch {
 setError('Failed to load queue.');
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
 <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
 <Users size={24} className="text-purple-600" />
 Centre Queue
 </h1>
 <p className="text-mono-muted mt-1">Manage incoming citizen service requests</p>
 </div>
 </div>

 {error && (
 <div className="bg-red-600/10 text-red-600 p-4 rounded-[16px] mb-6 border border-red-600/20">{error}</div>
 )}

 {requests.length === 0 && !error ? (
 <div className="text-center py-16 bg-mono-surface rounded-[16px] border border-mono-border ">
 <FileText className="mx-auto text-mono-muted mb-4" size={48} />
 <h3 className="text-lg font-semibold text-mono-text mb-2">Queue is empty</h3>
 <p className="text-mono-muted">No active requests for your centre.</p>
 </div>
 ) : (
 <div className="bg-mono-surface rounded-[16px] border border-mono-border overflow-hidden">
 <ul className="divide-y divide-ink-100">
 {requests.map((req) => (
 <li key={req.id}>
 <button
 onClick={() => navigate('/employee/requests/' + req.id)}
 className="w-full flex items-center gap-4 p-5 hover:bg-mono-bg transition-colors text-left"
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-1">
 <span className="font-semibold text-mono-text truncate">{req.service_name_snapshot}</span>
 <span className={('px-2 py-0.5 rounded-full text-xs font-medium ' + (STATUS_COLORS[req.status] || 'bg-mono-bg text-mono-muted'))}>
 {formatStatus(req.status)}
 </span>
 </div>
 <div className="text-sm text-mono-muted">
 Type {req.service_type_snapshot}
 {req.fee_snapshot ? ' · Rs ' + req.fee_snapshot : ' · Free'}
 {' · '}{new Date(req.created_at).toLocaleDateString()}
 </div>
 </div>
 <ChevronRight className="text-mono-muted flex-shrink-0" size={18} />
 </button>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 );
}
