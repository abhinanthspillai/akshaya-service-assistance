import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Search, Loader2, FileSearch } from 'lucide-react';

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
  const [selectedType, setSelectedType] = useState<string | null>(null);
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

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType ? s.service_type === selectedType : true;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Service Catalogue</h1>
        <p className="text-slate-500 mt-1">Browse and request Akshaya services.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 flex-1 transition-shadow focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search services by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-slate-700 placeholder:text-slate-400 text-sm bg-transparent"
          />
        </div>

        <div className="flex gap-2">
          {['All', 'A', 'B', 'C'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type === 'All' ? null : type)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                (type === 'All' && selectedType === null) || selectedType === type
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              {type === 'All' ? 'All Types' : `Type ${type}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 text-sm">
          {error}
        </div>
      )}

      {filteredServices.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <FileSearch className="mx-auto text-slate-300 mb-3" size={32} />
          <h3 className="text-sm font-medium text-slate-900 mb-1">No services found</h3>
          <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group">
              <div className="flex justify-between items-start mb-4">
                <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Type {service.service_type}
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">{service.code}</span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-indigo-700 transition-colors">{service.name}</h3>
              <p className="text-slate-500 text-sm mb-6 line-clamp-3">{service.description || 'No description available'}</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">
                  {service.base_fee ? '₹' + service.base_fee : 'Free'}
                </span>
                <button 
                  onClick={() => navigate(`/services/${service.id}`)}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
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