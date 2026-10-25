import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, FileCheck } from 'lucide-react';
import { formatFee } from '../../utils/format';

interface ServiceDetail {
  id: string;
  name: string;
  code: string;
  description: string;
  service_type: string;
  base_fee: number | string | null;
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
        <Loader2 className="animate-spin text-mono-text" size={32} />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-red-600/10 text-red-600 p-4 rounded-xl border border-red-600/20">
        {error || 'Service not found'}
      </div>
    );
  }

  const cleanServiceDescription = (desc: string | null | undefined): string => {
    if (!desc) return 'Apply for this service online through your certified local Akshaya Centre.';
    const cleaned = desc
      .replace(/^(Remote Processing\.|Hybrid Service\.|Physical Visit Required\.|Fully Digital\.)\s*/i, '')
      .trim();
    return cleaned || 'Apply for this service online through your certified local Akshaya Centre.';
  };

  const requiredDocuments = service.document_requirements.filter(
    req => req.requirement_type === 'REQUIRED'
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <button 
        onClick={() => navigate('/services')}
        className="flex items-center gap-2 text-sm text-mono-muted hover:text-mono-text mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Services
      </button>

      <div className="bg-mono-bg rounded-2xl border border-mono-border overflow-hidden shadow-sm">
        {/* Top Header Card */}
        <div className="p-8 border-b border-mono-border bg-mono-surface/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-mono-muted uppercase tracking-wider bg-mono-surface px-2.5 py-1 rounded-lg border border-mono-border">
                  {service.code}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Fully Digital Service
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-mono-text mb-3">{service.name}</h1>
              <p className="text-mono-muted text-base leading-relaxed max-w-2xl">
                {cleanServiceDescription(service.description)}
              </p>
            </div>
            
            {/* Centered Start Request Card */}
            <div className="shrink-0 flex flex-col items-center justify-center text-center bg-white p-6 rounded-2xl border border-mono-border md:w-64 shadow-xs self-stretch md:self-auto">
              <div className="text-[11px] font-bold text-mono-muted uppercase tracking-wider mb-1 text-center">
                Base Fee
              </div>
              <div className="text-3xl font-extrabold text-mono-text mb-4 text-center">
                {formatFee(service.base_fee)}
              </div>
              <button 
                onClick={() => navigate(`/services/${service.id}/request`)}
                className="w-full bg-mono-text hover:bg-black text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-sm cursor-pointer text-center"
              >
                Start Request
              </button>
            </div>
          </div>
        </div>

        {/* Document Requirements (Full Width, Only Required Docs) */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-mono-surface rounded-xl text-mono-text border border-mono-border">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-mono-text">Document Requirements</h2>
              <p className="text-xs text-mono-muted mt-0.5">Please ensure you have these documents available before initiating your request.</p>
            </div>
          </div>
          
          {requiredDocuments.length === 0 ? (
            <div className="p-6 bg-mono-surface/50 rounded-xl border border-mono-border text-sm text-mono-muted text-center">
              No mandatory documents required for this service.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requiredDocuments.map(req => (
                <div key={req.id} className="p-4 bg-mono-surface/40 rounded-xl border border-mono-border flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-mono-text text-sm">{req.name}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      Required
                    </span>
                  </div>
                  {req.allowed_file_types.length > 0 && (
                    <div className="text-xs text-mono-muted">
                      Formats: {req.allowed_file_types.map(ft => ft.mime_type.split('/')[1].toUpperCase()).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}