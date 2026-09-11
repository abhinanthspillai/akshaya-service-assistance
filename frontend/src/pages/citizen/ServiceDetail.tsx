import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, FileCheck, Users } from 'lucide-react';

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
    is_required: boolean;
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
        const res = await api.get(/services/ + (id || ''));
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
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
        {error || 'Service not found'}
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={() => navigate('/services')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Services
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-purple-50/50 to-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Type {service.service_type}
            </span>
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{service.code}</span>
          </div>
          
          <h1 className="text-3xl font-bold text-indigo-950 mb-4">{service.name}</h1>
          <p className="text-slate-600 text-lg leading-relaxed max-w-3xl">
            {service.description || 'No detailed description available for this service.'}
          </p>
          
          <div className="mt-8">
            <div className="text-sm text-slate-500 mb-1">Base Fee</div>
            <div className="text-2xl font-bold text-slate-900">
              {service.base_fee ? '?' + service.base_fee : 'Free'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <FileCheck size={20} />
              </div>
              <h2 className="text-lg font-semibold text-indigo-950">Document Requirements</h2>
            </div>
            
            {service.document_requirements.length === 0 ? (
              <p className="text-slate-500 text-sm">No documents required.</p>
            ) : (
              <ul className="space-y-4">
                {service.document_requirements.map(req => (
                  <li key={req.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{req.name}</span>
                      {req.is_required && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    {req.allowed_file_types.length > 0 && (
                      <div className="text-xs text-slate-500">
                        Allowed: {req.allowed_file_types.map(ft => ft.mime_type.split('/')[1]).join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Users size={20} />
              </div>
              <h2 className="text-lg font-semibold text-indigo-950">Interaction Requirements</h2>
            </div>

            {service.interaction_requirements.length === 0 ? (
              <p className="text-slate-500 text-sm">No interactions required.</p>
            ) : (
              <ul className="space-y-4">
                {service.interaction_requirements.map(req => (
                  <li key={req.id} className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{req.name}</span>
                    {req.is_mandatory && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Mandatory</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm shadow-purple-200">
            Start Request
          </button>
        </div>
      </div>
    </div>
  );
}