import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, FileCheck, Users, Info } from 'lucide-react';

interface ServiceDetail {
 id: string;
 name: string;
 code: string;
 description: string;
 service_type: string;
 base_fee: number;
 document_requirements: Array<{
 id: string;
 name: string;
 requirement_type: string;
 allowed_file_types: Array<{ mime_type: string }>;
 }>;
 interaction_requirements: Array<{
 id: string;
 name: string;
 is_mandatory: boolean;
 }>;
}

export function ServiceDetail() {
 const { id } = useParams<{ id: string }>();
 const [service, setService] = useState<ServiceDetail | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');
 const navigate = useNavigate();

 useEffect(() => {
 const fetchService = async () => {
 try {
 const res = await api.get(`/services/${id || ''}`);
 setService(res.data);
 } catch {
 setError('Failed to load service details.');
 } finally {
 setIsLoading(false);
 }
 };
 if (id) fetchService();
 }, [id]);

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <Loader2 className="animate-spin text-apple-text" size={32} />
 </div>
 );
 }

 if (error || !service) {
 return (
 <div className="bg-apple-red/10 text-apple-red p-4 rounded-[16px] border border-apple-red/20">
 {error || 'Service not found'}
 </div>
 );
 }

 return (
 <div>
 <button 
 onClick={() => navigate('/services')}
 className="flex items-center gap-2 text-sm text-apple-muted hover:text-apple-text mb-6 transition-colors"
 >
 <ArrowLeft size={16} />
 Back to Services
 </button>

 <div className="apple-card overflow-hidden">
 <div className="p-6 border-b border-apple-muted/20 bg-white /50 to-white relative">
 <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-2">
 <div className="flex-1">
 <div className="flex flex-wrap items-center gap-3 mb-4">
 <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-apple-blue">
 Type {service.service_type}
 </span>
 <span className="text-sm font-semibold text-apple-muted uppercase tracking-wider bg-white px-2 py-1 rounded-md border border-apple-muted/20">{service.code}</span>
 </div>
 
 <h1 className="text-2xl sm:text-3xl font-bold text-apple-text mb-4">{service.name}</h1>
 <p className="text-apple-muted text-base sm:text-lg leading-relaxed max-w-3xl mb-4">
 {service.description || 'No detailed description available for this service.'}
 </p>

 <div className="flex items-start sm:items-center gap-2 text-xs text-apple-text bg-apple-blue/10/80 p-3 rounded-[16px] border border-apple-blue/20 max-w-sm">
 <Info size={16} className="shrink-0 mt-0.5 sm:mt-0" />
 <span>
 {service.service_type === 'A' && "Type A: Predominantly digital service with minimal centre interaction required."}
 {service.service_type === 'B' && "Type B: Some centre interaction may be required for processing or document verification."}
 {service.service_type === 'C' && "Type C: Substantial physical participation or in-person verification required at the centre."}
 </span>
 </div>
 </div>
 
 <div className="shrink-0 flex flex-col md:items-end gap-4 bg-apple-bg p-5 rounded-[16px] border border-apple-muted/20 md:w-64">
 <div>
 <div className="text-xs font-semibold text-apple-muted mb-1 uppercase tracking-wider md:text-right">Base Fee</div>
 <div className="text-2xl font-bold text-apple-text md:text-right">
 {service.base_fee ? '₹' + service.base_fee : 'Free'}
 </div>
 </div>
 <button 
 onClick={() => navigate(`/services/${service.id}/request`)}
 className="w-full bg-ink-900 hover:bg-ink-800 text-white font-semibold px-6 py-3 rounded-[16px] transition-all hover:-translate-y-0.5 shadow-sm mt-2"
 >
 Start Request
 </button>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-ink-100">
 <div className="p-6">
 <div className="flex items-center gap-3 mb-6">
 <div className="p-2 bg-apple-blue/10 rounded-[16px] text-apple-text">
 <FileCheck size={20} />
 </div>
 <h2 className="text-lg font-semibold text-indigo-950">Document Requirements</h2>
 </div>
 
 {service.document_requirements.length === 0 ? (
 <p className="text-apple-muted text-sm">No documents required.</p>
 ) : (
 <ul className="space-y-4">
 {service.document_requirements.map(req => (
 <li key={req.id} className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <span className="font-medium text-apple-text">{req.name}</span>
 {req.requirement_type === 'REQUIRED' && (
 <span className="text-[10px] uppercase tracking-wider font-bold text-apple-red bg-apple-red/10 px-2 py-0.5 rounded">Required</span>
 )}
 {req.requirement_type === 'CONDITIONAL' && (
 <span className="text-[10px] uppercase tracking-wider font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Conditional</span>
 )}
 {req.requirement_type === 'OPTIONAL' && (
 <span className="text-[10px] uppercase tracking-wider font-bold text-apple-muted bg-ink-200 px-2 py-0.5 rounded">Optional</span>
 )}
 </div>
 {req.allowed_file_types.length > 0 && (
 <div className="text-xs text-apple-muted">
 Allowed: {req.allowed_file_types.map(ft => ft.mime_type.split('/')[1]).join(', ')}
 </div>
 )}
 </li>
 ))}
 </ul>
 )}
 </div>

 <div className="p-6">
 <div className="flex items-center gap-3 mb-6">
 <div className="p-2 bg-apple-blue/10 rounded-[16px] text-apple-text">
 <Users size={20} />
 </div>
 <h2 className="text-lg font-semibold text-indigo-950">Interaction Requirements</h2>
 </div>

 {service.interaction_requirements.length === 0 ? (
 <p className="text-apple-muted text-sm">No interactions required.</p>
 ) : (
 <ul className="space-y-4">
 {service.interaction_requirements.map(req => (
 <li key={req.id} className="flex items-center gap-2">
 <span className="font-medium text-apple-text">{req.name}</span>
 {req.is_mandatory && (
 <span className="text-[10px] uppercase tracking-wider font-bold text-apple-red bg-apple-red/10 px-2 py-0.5 rounded">Mandatory</span>
 )}
 </li>
 ))}
 </ul>
 )}
 </div>
 </div>
 
 </div>
 </div>
 );
}