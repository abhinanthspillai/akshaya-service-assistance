import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  Search, 
  Loader2, 
  FileSearch, 
  LayoutGrid, 
  FileText, 
  Users, 
  List, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  IndianRupee, 
  House, 
  MapPinHouse, 
  CreditCard, 
  BookOpen, 
  Vote, 
  Baby, 
  HeartHandshake, 
  Fingerprint, 
  RefreshCw, 
  BadgeCheck,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatFee } from '../../utils/format';

interface Service {
  id: string;
  name: string;
  code: string;
  description: string;
  service_type: string;
  base_fee: number | string | null;
}

export function ServiceCatalogue() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'name-asc' | 'name-desc' | 'fee-asc' | 'fee-desc'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
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

  const getServiceIcon = (name: string, size: number = 20) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('income')) return <IndianRupee size={size} strokeWidth={2} />;
    if (lowerName.includes('residence')) return <House size={size} strokeWidth={2} />;
    if (lowerName.includes('community')) return <Users size={size} strokeWidth={2} />;
    if (lowerName.includes('nativity')) return <MapPinHouse size={size} strokeWidth={2} />;
    if (lowerName.includes('pan')) return <CreditCard size={size} strokeWidth={2} />;
    if (lowerName.includes('passport')) return <BookOpen size={size} strokeWidth={2} />;
    if (lowerName.includes('voter') || lowerName.includes('election')) return <Vote size={size} strokeWidth={2} />;
    if (lowerName.includes('birth')) return <Baby size={size} strokeWidth={2} />;
    if (lowerName.includes('death')) return <FileText size={size} strokeWidth={2} />;
    if (lowerName.includes('marriage')) return <HeartHandshake size={size} strokeWidth={2} />;
    if (lowerName.includes('aadhaar enrollment') || lowerName.includes('aadhaar enrolment')) return <Fingerprint size={size} strokeWidth={2} />;
    if (lowerName.includes('aadhaar updation')) return <RefreshCw size={size} strokeWidth={2} />;
    if (lowerName.includes('jeevan pramaan') || lowerName.includes('life certificate')) return <BadgeCheck size={size} strokeWidth={2} />;
    return <FileText size={size} strokeWidth={2} />;
  };

  const filteredServices = useMemo(() => {
    const query = search.toLowerCase();
    let list = services.filter(s => {
      return (
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query))
      );
    });

    if (sortBy === 'name-asc') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'fee-asc') {
      list = [...list].sort((a, b) => (Number(a.base_fee) || 0) - (Number(b.base_fee) || 0));
    } else if (sortBy === 'fee-desc') {
      list = [...list].sort((a, b) => (Number(b.base_fee) || 0) - (Number(a.base_fee) || 0));
    }

    return list;
  }, [services, search, sortBy]);

  const cleanServiceDescription = (desc: string | null | undefined, name: string): string => {
    if (!desc) return `Apply for ${name.toLowerCase()} online.`;
    const cleaned = desc
      .replace(/^(Remote Processing\.|Hybrid Service\.|Physical Visit Required\.|Fully Digital\.)\s*/i, '')
      .trim();
    return cleaned || `Apply for ${name.toLowerCase()} online.`;
  };

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="pb-12">
      <PageHeader 
        title="Services"
        subtitle="Browse and apply for government services online."
      />

      {/* Repositioned Search bar (Moved to prominent position where type pills were) */}
      <div className="mb-8 max-w-xl">
        <Input
          type="text"
          placeholder="Search services by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          icon={<Search size={18} />}
        />
      </div>

      {/* Subheader and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-mono-text">All Services ({filteredServices.length})</h2>
          <p className="text-[14px] text-mono-muted mt-1">Find the service you need and apply in a few simple steps.</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-mono-muted">Sort by</span>
            <div className="w-40">
              <Select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
              >
                <option value="popular">Popular</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="fee-asc">Fee (Low to High)</option>
                <option value="fee-desc">Fee (High to Low)</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-mono-muted">View</span>
            <div className="flex items-center bg-mono-surface rounded-lg p-1 border border-mono-border">
              <button 
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'grid' ? "bg-mono-text text-mono-bg shadow-sm" : "text-mono-muted hover:text-mono-text"
                )}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={clsx(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'list' ? "bg-mono-text text-mono-bg shadow-sm" : "text-mono-muted hover:text-mono-text"
                )}
                title="List view"
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-mono-surface text-mono-text p-4 rounded-xl mb-6 border border-mono-border text-[14px] flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Services List / Grid */}
      {isLoading && services.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-mono-bg p-5 rounded-xl border border-mono-border animate-pulse h-40 flex flex-col justify-between shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-mono-surface shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-mono-surface rounded w-3/4" />
                  <div className="h-3 bg-mono-surface rounded w-full" />
                </div>
              </div>
              <div className="pt-4 border-t border-mono-border/50 flex justify-between">
                <div className="h-4 bg-mono-surface rounded w-16" />
                <div className="h-4 bg-mono-surface rounded w-4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 && !error ? (
        <div className="bg-mono-bg border border-mono-border rounded-xl shadow-sm">
          <EmptyState
            icon={<FileSearch size={32} />}
            title="No services found"
            description="Try adjusting your search query."
          />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedServices.map((service) => (
            <button
              key={service.id}
              onClick={() => navigate(`/services/${service.id}`)}
              className="bg-mono-bg p-5 rounded-xl shadow-sm border border-mono-border hover:border-mono-text/30 transition-all text-left flex flex-col h-full group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
                  {getServiceIcon(service.name, 20)}
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-mono-text leading-tight group-hover:text-black">{service.name}</h3>
                  <p className="text-mono-muted text-[13px] font-medium mt-1 line-clamp-2">
                    {cleanServiceDescription(service.description, service.name)}
                  </p>
                </div>
              </div>
              
              <div className="mt-auto pt-4 flex items-center justify-between w-full border-t border-mono-border/50">
                <span className="text-[13px] font-semibold text-mono-text">
                  {formatFee(service.base_fee)}
                </span>
                <ChevronRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-mono-bg rounded-xl border border-mono-border divide-y divide-mono-border overflow-hidden shadow-sm">
          {paginatedServices.map((service) => (
            <div
              key={service.id}
              onClick={() => navigate(`/services/${service.id}`)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-mono-surface/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
                  {getServiceIcon(service.name, 22)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[15px] text-mono-text group-hover:text-black">{service.name}</h3>
                    <span className="text-[11px] font-semibold text-mono-muted px-2 py-0.5 bg-mono-surface rounded">
                      {service.code}
                    </span>
                  </div>
                  <p className="text-mono-muted text-[13px] mt-0.5 line-clamp-1">
                    {cleanServiceDescription(service.description, service.name)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pl-15 sm:pl-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-mono-muted">Fee</div>
                  <div className="text-[14px] font-bold text-mono-text">
                    {formatFee(service.base_fee)}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-4 py-2 bg-mono-surface text-mono-text group-hover:bg-mono-text group-hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  View Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredServices.length > 0 && (
        <div className="mt-8 pt-6 flex items-center justify-between border-t border-mono-border">
          <p className="text-[13px] font-medium text-mono-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredServices.length)} of {filteredServices.length} services
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-mono-border text-mono-muted hover:text-mono-text hover:bg-mono-surface disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={clsx(
                  "w-8 h-8 flex items-center justify-center rounded-lg text-[14px] font-semibold transition-colors",
                  currentPage === page 
                    ? "bg-mono-text text-mono-bg" 
                    : "border border-mono-border text-mono-text hover:bg-mono-surface"
                )}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-mono-border text-mono-muted hover:text-mono-text hover:bg-mono-surface disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}