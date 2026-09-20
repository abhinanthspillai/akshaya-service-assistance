import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, Search, Plus, MoreVertical, ChevronDown, ChevronLeft, ChevronRight, FileText, Users, Home, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface ServiceRequest {
 id: string;
 status: string;
 service_name_snapshot: string;
 service_type_snapshot: string;
 fee_snapshot: number | null;
 submitted_at: string | null;
 created_at: string;
 updated_at: string;
 selected_centre_id: string | null;
}

type Tab = 'All' | 'Needs Action' | 'In Progress' | 'Completed' | 'Drafts' | 'Cancelled';

export function MyRequests() {
 const [requests, setRequests] = useState<ServiceRequest[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');
 const [activeTab, setActiveTab] = useState<Tab>('All');
 const [searchQuery, setSearchQuery] = useState('');
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;
 const navigate = useNavigate();

 useEffect(() => {
 const fetchRequests = async () => {
 try {
 const res = await api.get('/requests/');
 setRequests(res.data);
 } catch {
 setError('Failed to load requests. Please try again later.');
 } finally {
 setIsLoading(false);
 }
 };
 fetchRequests();
 }, []);

 const getFilteredRequests = () => {
 const needsAttentionStates = ['CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'PAYMENT_PENDING'];
 const inProgressStates = ['SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING'];
 const completedStates = ['COMPLETED', 'CLOSED'];
 const cancelledStates = ['CANCELLED', 'UNABLE_TO_PROCEED'];
 const draftStates = ['DRAFT'];

 let filtered = requests;

 if (activeTab !== 'All') {
 filtered = filtered.filter(r => {
 if (activeTab === 'Needs Action') return needsAttentionStates.includes(r.status);
 if (activeTab === 'In Progress') return inProgressStates.includes(r.status);
 if (activeTab === 'Completed') return completedStates.includes(r.status);
 if (activeTab === 'Cancelled') return cancelledStates.includes(r.status);
 if (activeTab === 'Drafts') return draftStates.includes(r.status);
 return false;
 });
 }

 if (searchQuery) {
 const query = searchQuery.toLowerCase();
 filtered = filtered.filter(r => 
 r.service_name_snapshot.toLowerCase().includes(query) || 
 r.id.toLowerCase().includes(query)
 );
 }

 return filtered;
 };

 const filteredRequests = getFilteredRequests();
 const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
 const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 const getStatusDisplay = (status: string) => {
 const formatted = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
 return formatted;
 };

 const getServiceIcon = (name: string) => {
 const lower = name.toLowerCase();
 if (lower.includes('card') || lower.includes('member')) return <Users size={18} strokeWidth={2} />;
 if (lower.includes('residence') || lower.includes('address')) return <Home size={18} strokeWidth={2} />;
 return <FileText size={18} strokeWidth={2} />;
 };

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <Loader2 className="animate-spin text-mono-text" size={32} />
 </div>
 );
 }

 const tabs: Tab[] = ['All', 'Needs Action', 'In Progress', 'Completed', 'Drafts', 'Cancelled'];

 return (
 <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
 <div>
 <h1 className="text-3xl font-bold text-mono-text tracking-tight">My Requests</h1>
 <p className="text-sm font-medium text-mono-muted mt-2">Track and manage all your service requests in one place.</p>
 </div>
 <button
 onClick={() => navigate('/services')}
 className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mono-text text-mono-bg text-sm font-bold hover:opacity-90 shadow-sm transition-opacity"
 >
 <Plus size={18} strokeWidth={2.5} />
 New Request
 </button>
 </div>

 {error && (
 <div className="bg-mono-surface text-mono-text p-4 rounded-xl mb-6 border border-mono-border text-sm flex items-start gap-3">
 <AlertCircle size={20} className="shrink-0 mt-0.5" />
 <span>{error}</span>
 </div>
 )}

 {/* Tabs */}
 <div className="flex gap-6 overflow-x-auto border-b border-mono-border mb-6 hide-scrollbar">
 {tabs.map((tab) => {
 let count = 0;
 const needsAttentionStates = ['CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'PAYMENT_PENDING'];
 const inProgressStates = ['SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING'];
 const completedStates = ['COMPLETED', 'CLOSED'];
 const cancelledStates = ['CANCELLED', 'UNABLE_TO_PROCEED'];
 const draftStates = ['DRAFT'];

 if (tab === 'All') count = requests.length;
 else if (tab === 'Needs Action') count = requests.filter(r => needsAttentionStates.includes(r.status)).length;
 else if (tab === 'In Progress') count = requests.filter(r => inProgressStates.includes(r.status)).length;
 else if (tab === 'Completed') count = requests.filter(r => completedStates.includes(r.status)).length;
 else if (tab === 'Drafts') count = requests.filter(r => draftStates.includes(r.status)).length;
 else if (tab === 'Cancelled') count = requests.filter(r => cancelledStates.includes(r.status)).length;

 const isActive = activeTab === tab;

 return (
 <button
 key={tab}
 onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
 className={clsx(
 "pb-4 text-sm flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 relative top-[1px]",
 isActive
 ? "text-mono-text font-bold border-mono-text"
 : "text-mono-muted font-medium border-transparent hover:text-mono-text"
 )}
 >
 {tab}
 <span className={clsx(
 "px-2 py-0.5 rounded-full text-xs font-bold",
 isActive ? "bg-mono-text text-mono-bg" : "bg-mono-surface text-mono-text"
 )}>
 {count}
 </span>
 </button>
 );
 })}
 </div>

 <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden">
 {/* Filters */}
 <div className="p-4 border-b border-mono-border flex flex-col sm:flex-row gap-4">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted" size={18} />
 <input
 type="text"
 placeholder="Search by service name or request ID..."
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
 className="w-full pl-10 pr-4 py-2 bg-mono-bg border border-mono-border rounded-lg text-sm font-medium placeholder:text-mono-muted focus:outline-none focus:border-mono-text transition-all"
 />
 </div>
 <div className="flex gap-4 flex-1">
 <div className="relative flex-1 max-w-[200px]">
 <select className="w-full appearance-none pl-4 pr-10 py-2 bg-mono-bg border border-mono-border rounded-lg text-sm font-bold text-mono-text focus:outline-none focus:border-mono-text transition-all">
 <option>All Services</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-mono-muted pointer-events-none" size={16} />
 </div>
 <div className="relative flex-1 max-w-[200px]">
 <select className="w-full appearance-none pl-4 pr-10 py-2 bg-mono-bg border border-mono-border rounded-lg text-sm font-bold text-mono-text focus:outline-none focus:border-mono-text transition-all">
 <option>All Statuses</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-mono-muted pointer-events-none" size={16} />
 </div>
 <div className="relative flex-1 max-w-[200px]">
 <select className="w-full appearance-none pl-4 pr-10 py-2 bg-mono-bg border border-mono-border rounded-lg text-sm font-bold text-mono-text focus:outline-none focus:border-mono-text transition-all">
 <option>All Time</option>
 </select>
 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-mono-muted pointer-events-none" size={16} />
 </div>
 </div>
 <button className="px-4 py-2 border border-mono-border rounded-lg text-sm font-bold text-mono-text hover:bg-mono-surface transition-colors">
 Reset
 </button>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-mono-surface">
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider">#</th>
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider">Service</th>
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider">Request ID</th>
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider">Submitted On</th>
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider">Status</th>
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider">Last Updated</th>
 <th className="px-6 py-4 text-xs font-bold text-mono-muted uppercase tracking-wider text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-mono-border">
 {paginatedRequests.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-6 py-16 text-center text-mono-muted text-sm font-medium">
 No requests found matching your filters.
 </td>
 </tr>
 ) : (
 paginatedRequests.map((req, idx) => (
 <tr key={req.id} className="hover:bg-mono-surface/50 transition-colors">
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mono-muted">
 {(currentPage - 1) * itemsPerPage + idx + 1}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center gap-3">
 <div className="text-mono-text">
 {getServiceIcon(req.service_name_snapshot)}
 </div>
 <span className="text-sm font-bold text-mono-text">{req.service_name_snapshot}</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mono-muted">
 {req.id.split('-').pop()?.padStart(4, '0') ? `#REQ-2025-${req.id.split('-').pop()?.padStart(4, '0')}` : req.id}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mono-muted">
 {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={clsx(
 "px-3 py-1 text-[11px] font-bold rounded-full bg-mono-surface text-mono-text",
 req.status === 'CORRECTION_REQUIRED' || req.status === 'INTERACTION_REQUIRED' ? "border border-mono-border" : ""
 )}>
 {getStatusDisplay(req.status)}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-mono-muted">
 {new Date(req.updated_at || req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => navigate(`/requests/${req.id}`)}
 className="px-4 py-1.5 border border-mono-border rounded-lg text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors"
 >
 {req.status === 'DRAFT' ? 'Edit' : 'View'}
 </button>
 <button className="p-1.5 text-mono-muted hover:text-mono-text rounded-md hover:bg-mono-surface transition-colors">
 <MoreVertical size={16} />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {filteredRequests.length > 0 && (
 <div className="px-6 py-4 border-t border-mono-border flex items-center justify-between">
 <p className="text-sm font-medium text-mono-muted">
 Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
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
 "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors",
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
 </div>
 );
}
