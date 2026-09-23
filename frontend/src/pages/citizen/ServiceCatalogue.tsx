import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Search, Loader2, FileSearch, LayoutGrid, FileText, Users, IdCard, List, ChevronRight, ChevronLeft, AlertCircle, IndianRupee, House, MapPinHouse, CreditCard, BookOpen, Vote, Baby, HeartHandshake, Fingerprint, RefreshCw, BadgeCheck } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

interface Service {
 id: string;
 name: string;
 code: string;
 description: string;
 service_type: string;
 base_fee: number;
}

type Category = 'All Services' | 'Type A — Remote' | 'Type B — Hybrid' | 'Type C — Visit Required';

export function ServiceCatalogue() {
 const [services, setServices] = useState<Service[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');
 const [search, setSearch] = useState('');
 const [activeCategory, setActiveCategory] = useState<Category>('All Services');
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

 const getCategory = (service_type: string): Category => {
 if (service_type === 'A') return 'Type A — Remote';
 if (service_type === 'B') return 'Type B — Hybrid';
 if (service_type === 'C') return 'Type C — Visit Required';
 return 'All Services';
 };

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

 const categories: { name: Category, icon: React.ReactNode }[] = [
 { name: 'All Services', icon: <LayoutGrid size={16} /> },
 { name: 'Type A — Remote', icon: <House size={16} /> },
 { name: 'Type B — Hybrid', icon: <IdCard size={16} /> },
 { name: 'Type C — Visit Required', icon: <Users size={16} /> }
 ];

 const filteredServices = useMemo(() => {
 return services.filter(s => {
 const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
 s.code.toLowerCase().includes(search.toLowerCase());
 const matchesCategory = activeCategory === 'All Services' ? true : getCategory(s.service_type) === activeCategory;
 return matchesSearch && matchesCategory;
 });
 }, [services, search, activeCategory]);

 const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
 const paginatedServices = filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <Loader2 className="animate-spin text-mono-text" size={32} />
 </div>
 );
 }

 return (
 <div className="pb-12">
 <PageHeader 
 title="Services"
 subtitle="Browse and apply for government services online."
 >
 <div className="w-full md:w-64">
 <Input
 type="text"
 placeholder="Search services..."
 value={search}
 onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
 icon={<Search size={18} />}
 />
 </div>
 </PageHeader>

 {/* Category Pills */}
 <div className="flex gap-3 overflow-x-auto pb-2 mb-8 hide-scrollbar">
 {categories.map((cat) => {
 const count = cat.name === 'All Services' 
 ? services.length 
 : services.filter(s => getCategory(s.service_type) === cat.name).length;

 const isActive = activeCategory === cat.name;

 return (
 <button
 key={cat.name}
 onClick={() => { setActiveCategory(cat.name); setCurrentPage(1); }}
 className={clsx(
 "flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold whitespace-nowrap transition-colors",
 isActive
 ? "bg-mono-text text-mono-bg"
 : "bg-mono-surface text-mono-text hover:bg-mono-border/50"
 )}
 >
 <span className={isActive ? "text-mono-bg" : "text-mono-muted"}>{cat.icon}</span>
 {cat.name} ({count})
 </button>
 );
 })}
 </div>

 {/* Subheader and Controls */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
 <div>
 <h2 className="text-[18px] font-semibold text-mono-text">{activeCategory}</h2>
 <p className="text-[14px] text-mono-muted mt-1">Find the service you need and apply in a few simple steps.</p>
 </div>

 <div className="flex items-center gap-4 shrink-0">
 <div className="flex items-center gap-2">
 <span className="text-[13px] font-medium text-mono-muted">Sort by</span>
 <div className="w-32">
 <Select>
 <option>Popular</option>
 <option>A-Z</option>
 </Select>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <span className="text-[13px] font-medium text-mono-muted">View</span>
 <div className="flex items-center bg-mono-surface rounded-lg p-1 border border-mono-border">
 <button className="p-1.5 bg-mono-text text-mono-bg rounded-md shadow-sm">
 <LayoutGrid size={16} />
 </button>
 <button className="p-1.5 text-mono-muted hover:text-mono-text rounded-md transition-colors">
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

 {/* Grid */}
 {filteredServices.length === 0 && !error ? (
 <div className="bg-mono-bg border border-mono-border rounded-xl shadow-sm">
 <EmptyState
 icon={<FileSearch size={32} />}
 title="No services found"
 description="Try adjusting your search or filters."
 />
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {paginatedServices.map((service) => {
 const cat = getCategory(service.service_type);

 return (
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
 {service.description || `Apply for ${service.name.toLowerCase()} online.`}
 </p>
 </div>
 </div>
 
 <div className="mt-auto pt-4 flex items-center justify-between w-full">
 <span className="inline-block px-3 py-1 bg-mono-surface text-mono-text text-[11px] font-semibold rounded-md">
 {cat}
 </span>
 <ChevronRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors" />
 </div>
 </button>
 );
 })}
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