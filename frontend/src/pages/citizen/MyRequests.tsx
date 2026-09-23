import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, Search, Plus, ChevronLeft, ChevronRight, FileText, Users, Home, AlertCircle, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

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
 
 const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean; id: string; status: string}>({isOpen: false, id: '', status: ''});
 const [isDeleting, setIsDeleting] = useState(false);

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

 const handleDeleteRequest = (id: string, status: string) => {
   setDeleteConfirm({ isOpen: true, id, status });
 };

 const executeDeleteRequest = async () => {
   const { id, status } = deleteConfirm;
   const action = status === 'DRAFT' ? 'delete' : 'archive';
   setIsDeleting(true);
   try {
     await api.delete(`/requests/${id}`);
     setRequests(requests.filter(r => r.id !== id));
     setDeleteConfirm({ isOpen: false, id: '', status: '' });
     setError('');
   } catch (err: any) {
     const msg = err.response?.data?.detail || `Failed to ${action} request. Please try again.`;
     setError(msg);
     setDeleteConfirm({ isOpen: false, id: '', status: '' });
   } finally {
     setIsDeleting(false);
   }
 };

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
 <div className="space-y-6 pb-12">
 <PageHeader 
 title="My Requests"
 subtitle="Track and manage all your service requests in one place."
 >
 <Button onClick={() => navigate('/services')} icon={<Plus size={18} strokeWidth={2.5} />}>
 New Request
 </Button>
 </PageHeader>

 {error && (
 <div className="bg-mono-surface text-mono-text p-4 rounded-xl mb-6 border border-mono-border text-sm flex items-start gap-3">
 <AlertCircle size={20} className="shrink-0 mt-0.5" />
 <span>{error}</span>
 </div>
 )}

 {/* Tabs */}
 <div className="flex gap-3 overflow-x-auto pb-2 mb-8 hide-scrollbar">
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
 "flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold whitespace-nowrap transition-colors",
 isActive
 ? "bg-mono-text text-mono-bg"
 : "bg-mono-surface text-mono-text hover:bg-mono-border/50"
 )}
 >
 {tab}
 <span className={clsx(
 "px-2 py-0.5 rounded-full text-[12px] font-semibold",
 isActive ? "bg-white/20 text-white" : "bg-mono-text/10 text-mono-text"
 )}>
 {count}
 </span>
 </button>
 );
 })}
 </div>

 <Card padding="none">
 {/* Filters */}
 <div className="p-4 border-b border-mono-border flex flex-col sm:flex-row gap-4">
 <div className="flex-1 max-w-sm">
 <Input
 type="text"
 placeholder="Search by service name or request ID..."
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
 icon={<Search size={18} />}
 />
 </div>
 <div className="flex gap-4 flex-1">
 <div className="flex-1 max-w-[200px]">
 <Select>
 <option>All Services</option>
 </Select>
 </div>
 <div className="flex-1 max-w-[200px]">
 <Select>
 <option>All Statuses</option>
 </Select>
 </div>
 <div className="flex-1 max-w-[200px]">
 <Select>
 <option>All Time</option>
 </Select>
 </div>
 </div>
 <Button variant="secondary" className="px-5">
 Reset
 </Button>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-mono-surface/50 border-b border-mono-border">
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide">#</th>
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide">Service</th>
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide">Request ID</th>
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide">Submitted On</th>
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide">Status</th>
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide">Last Updated</th>
 <th className="px-6 py-4 text-[13px] font-semibold text-mono-muted tracking-wide text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-mono-border/50">
 {paginatedRequests.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-6 py-16 text-center text-mono-muted text-[14px] font-medium">
 No requests found matching your filters.
 </td>
 </tr>
 ) : (
 paginatedRequests.map((req, idx) => (
 <tr key={req.id} className="hover:bg-mono-surface/30 transition-colors">
 <td className="px-6 py-4 whitespace-nowrap text-[14px] font-medium text-mono-muted">
 {(currentPage - 1) * itemsPerPage + idx + 1}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center gap-3">
 <div className="text-mono-text shrink-0">
 {getServiceIcon(req.service_name_snapshot)}
 </div>
 <span className="text-[14px] font-semibold text-mono-text">{req.service_name_snapshot}</span>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-[14px] font-medium text-mono-muted">
 #{req.id.substring(0, 8).toUpperCase()}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-[14px] font-medium text-mono-muted">
 {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={clsx(
 "px-2.5 py-1 text-[12px] font-semibold rounded-md",
 req.status === 'CORRECTION_REQUIRED' || req.status === 'INTERACTION_REQUIRED' 
 ? "bg-mono-bg border border-mono-border text-mono-text" 
 : "bg-mono-surface text-mono-text"
 )}>
 {getStatusDisplay(req.status)}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-[14px] font-medium text-mono-muted">
 {new Date(req.updated_at || req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right">
 <div className="flex items-center justify-end gap-2">
 <Button
 variant="secondary"
 size="sm"
 onClick={() => navigate(`/requests/${req.id}`)}
 >
 {req.status === 'DRAFT' ? 'Edit' : 'View'}
 </Button>
 {(req.status === 'DRAFT' || req.status === 'COMPLETED' || req.status === 'CANCELLED') ? (
   <button 
     onClick={() => handleDeleteRequest(req.id, req.status)}
     className="p-1.5 text-mono-muted hover:text-red-500 rounded-md hover:bg-mono-surface transition-colors"
     title={req.status === 'DRAFT' ? 'Delete request' : 'Archive request'}
   >
     <Trash2 size={16} />
   </button>
 ) : (
   <div className="w-7 h-7"></div>
 )}
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
 <p className="text-[13px] font-medium text-mono-muted">
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
 </Card>
 
 <ConfirmDialog
   isOpen={deleteConfirm.isOpen}
   title={deleteConfirm.status === 'DRAFT' ? "Delete Request" : "Archive Request"}
   message={`Are you sure you want to ${deleteConfirm.status === 'DRAFT' ? 'delete' : 'archive'} this request? This cannot be undone.`}
   confirmLabel={deleteConfirm.status === 'DRAFT' ? 'Delete' : 'Archive'}
   onConfirm={executeDeleteRequest}
   onCancel={() => setDeleteConfirm({ isOpen: false, id: '', status: '' })}
   isDestructive={true}
   isLoading={isDeleting}
 />
 </div>
 );
}
