import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Search, Loader2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  code: string;
  description: string;
  service_type: string;
  base_fee: number;
}

export function ServiceCatalogue() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services/');
        setServices(res.data);
      } catch {
        setError('Failed to load services. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-indigo-950">Service Catalogue</h1>
        <p className="text-slate-500 mt-1">Browse and request services</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search services by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-100">
          {error}
        </div>
      )}

      {filteredServices.length === 0 && !error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 mb-4">No services found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                  Type {service.service_type}
                </div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{service.code}</span>
              </div>
              
              <h3 className="text-lg font-semibold text-indigo-950 mb-2 leading-tight">{service.name}</h3>
              <p className="text-slate-600 text-sm mb-6 line-clamp-2">{service.description || 'No description available'}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm font-semibold text-slate-900">
                  {service.base_fee ? '?' + service.base_fee : 'Free'}
                </span>
                <button 
                  onClick={() => navigate(/services/ + service.id)}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}