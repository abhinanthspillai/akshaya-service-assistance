import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, Search, ArrowRight, Loader2, Plus, Clock, FileEdit, HelpCircle, PhoneCall, ChevronRight, Info } from 'lucide-react';
import clsx from 'clsx';

interface RequestSummary {
 id: string;
 service_name_snapshot: string;
 status: string;
 selected_centre_id?: string | null;
 updated_at: string;
}

export function Dashboard() {
 const { user } = useAuth();
 const navigate = useNavigate();
 const [requests, setRequests] = useState<RequestSummary[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 const fetchDashboardData = async () => {
 try {
 const [requestsRes] = await Promise.all([
 api.get('/requests')
 ]);
 setRequests(requestsRes.data || []);
 } catch (error) {
 console.error("Failed to fetch dashboard data:", error);
 } finally {
 setIsLoading(false);
 }
 };
 fetchDashboardData();
 }, []);

 if (isLoading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <Loader2 className="animate-spin text-mono-text" size={32} />
 </div>
 );
 }

 // Calculate summaries
 const needsActionRequests = requests.filter(r => ['CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'PAYMENT_PENDING'].includes(r.status));
 const inProgressRequests = requests.filter(r => ['SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING'].includes(r.status));
 const completedRequests = requests.filter(r => ['COMPLETED', 'CLOSED'].includes(r.status));
 const draftRequests = requests.filter(r => r.status === 'DRAFT');

 // Mock data for Recent Activity
 const recentActivities = [
 { title: 'Your request is under review', subtitle: 'Income Certificate #REQ-2025-00124', time: '2 days ago', active: true },
 { title: 'Document uploaded', subtitle: 'Birth Certificate #REQ-2025-00110', time: '4 days ago', active: false },
 { title: 'Request approved', subtitle: 'Residence Certificate #REQ-2025-00108', time: '6 days ago', active: true },
 { title: 'Request submitted', subtitle: 'Ration Card - Member Addition #REQ-2025-00118', time: '1 week ago', active: false }
 ];

 return (
 <div className="space-y-6 pb-12">
 {/* Header Area */}
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-bold text-mono-text tracking-tight">Good morning, {user?.full_name || 'Sample'}</h1>
 <p className="text-sm font-medium text-mono-muted mt-2">Here's a quick overview of your requests.</p>
 </div>
 <div>
 <Link to="/services" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-mono-text text-mono-bg text-sm font-bold hover:opacity-90 shadow-sm transition-opacity">
 <Plus size={18} strokeWidth={2.5} />
 New Request
 </Link>
 </div>
 </div>

 {/* Primary Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-mono-bg rounded-2xl p-6 border border-mono-border flex flex-col justify-between hover:border-mono-text/20 cursor-pointer transition-colors">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <FileText size={20} />
 </div>
 <div>
 <p className="text-sm font-bold text-mono-text">Needs Action</p>
 </div>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{needsActionRequests.length}</span>
 <p className="text-xs font-medium text-mono-muted mt-1">Requires your attention</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </div>

 <div className="bg-mono-bg rounded-2xl p-6 border border-mono-border flex flex-col justify-between hover:border-mono-text/20 cursor-pointer transition-colors">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <Clock size={20} />
 </div>
 <div>
 <p className="text-sm font-bold text-mono-text">In Progress</p>
 </div>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{inProgressRequests.length}</span>
 <p className="text-xs font-medium text-mono-muted mt-1">Being processed</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </div>

 <div className="bg-mono-bg rounded-2xl p-6 border border-mono-border flex flex-col justify-between hover:border-mono-text/20 cursor-pointer transition-colors">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <CheckCircle size={20} />
 </div>
 <div>
 <p className="text-sm font-bold text-mono-text">Completed</p>
 </div>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{completedRequests.length}</span>
 <p className="text-xs font-medium text-mono-muted mt-1">Successfully resolved</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </div>

 <div className="bg-mono-bg rounded-2xl p-6 border border-mono-border flex flex-col justify-between hover:border-mono-text/20 cursor-pointer transition-colors">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <FileEdit size={20} />
 </div>
 <div>
 <p className="text-sm font-bold text-mono-text">Drafts</p>
 </div>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{draftRequests.length}</span>
 <p className="text-xs font-medium text-mono-muted mt-1">Not yet submitted</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </div>
 </div>

 {/* Main Area */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column (Attention & Timeline) */}
 <div className="lg:col-span-2 space-y-6">
 {/* Requests requiring attention */}
 <div className="bg-mono-bg rounded-2xl border border-mono-border p-6 shadow-sm">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-mono-text">Requests requiring your attention</h2>
 <button className="text-sm font-bold text-mono-text flex items-center gap-1 hover:opacity-70">
 View all <ArrowRight size={16} />
 </button>
 </div>
 <div className="space-y-4">
 <div className="border border-mono-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <FileText size={24} strokeWidth={1.5} />
 </div>
 <div>
 <h3 className="font-bold text-mono-text text-base">Income Certificate</h3>
 <p className="text-sm font-medium text-mono-muted mt-0.5">#REQ-2025-00124</p>
 <p className="text-xs font-medium text-mono-muted mt-2 flex items-center gap-1">
 <Clock size={12} /> Updated 2 days ago
 </p>
 </div>
 </div>
 <div className="flex flex-col sm:items-end gap-2">
 <span className="bg-mono-surface text-mono-text text-xs font-bold px-3 py-1 rounded-full w-fit">Action Required</span>
 <p className="text-xs font-medium text-mono-muted text-right">Upload required document<br/>(Aadhaar copy)</p>
 </div>
 <button className="w-full sm:w-auto px-6 py-2.5 bg-mono-text text-mono-bg rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
 Upload
 </button>
 </div>
 
 <div className="border border-mono-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
 </div>
 <div>
 <h3 className="font-bold text-mono-text text-base">Ration Card - Member Addition</h3>
 <p className="text-sm font-medium text-mono-muted mt-0.5">#REQ-2025-00118</p>
 <p className="text-xs font-medium text-mono-muted mt-2 flex items-center gap-1">
 <Clock size={12} /> Updated 3 days ago
 </p>
 </div>
 </div>
 <div className="flex flex-col sm:items-end gap-2">
 <span className="bg-mono-surface text-mono-text text-xs font-bold px-3 py-1 rounded-full w-fit">Additional Info Needed</span>
 <p className="text-xs font-medium text-mono-muted text-right">Provide additional details</p>
 </div>
 <button className="w-full sm:w-auto px-6 py-2.5 bg-mono-text text-mono-bg rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
 Continue
 </button>
 </div>
 </div>
 </div>

 {/* Recent Activity & Popular Services */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-mono-bg rounded-2xl border border-mono-border p-6 shadow-sm">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-mono-text">Recent activity</h2>
 <button className="text-sm font-bold text-mono-text flex items-center gap-1 hover:opacity-70">
 View all <ArrowRight size={16} />
 </button>
 </div>
 <div className="relative pl-3">
 <div className="absolute top-2 bottom-2 left-3 w-px bg-mono-border"></div>
 <div className="space-y-6">
 {recentActivities.map((act, idx) => (
 <div key={idx} className="relative pl-6">
 <div className={clsx("absolute left-[-5px] top-1.5 w-3 h-3 rounded-full border-2 border-mono-bg", act.active ? "bg-mono-text" : "bg-mono-border")}></div>
 <div className="flex justify-between items-start gap-4">
 <div>
 <p className={clsx("text-sm font-bold", act.active ? "text-mono-text" : "text-mono-muted")}>{act.title}</p>
 <p className="text-xs font-medium text-mono-muted mt-1">{act.subtitle}</p>
 </div>
 <span className="text-xs font-medium text-mono-muted whitespace-nowrap">{act.time}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="bg-mono-bg rounded-2xl border border-mono-border p-6 shadow-sm">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-mono-text">Popular services</h2>
 <button className="text-sm font-bold text-mono-text flex items-center gap-1 hover:opacity-70">
 View all <ArrowRight size={16} />
 </button>
 </div>
 <div className="space-y-4">
 {[
 { name: 'Income Certificate', desc: 'Apply for income certificate', icon: <FileText size={20} strokeWidth={1.5}/> },
 { name: 'Residence Certificate', desc: 'Apply for residence certificate', icon: <FileText size={20} strokeWidth={1.5}/> },
 { name: 'Ration Card Services', desc: 'Add member, update details', icon: <FileText size={20} strokeWidth={1.5}/> },
 { name: 'Birth & Death Certificate', desc: 'Apply for birth or death certificate', icon: <FileText size={20} strokeWidth={1.5}/> }
 ].map((s, idx) => (
 <div key={idx} className="flex items-center gap-4 cursor-pointer hover:bg-mono-surface p-2 -mx-2 rounded-lg transition-colors">
 <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 {s.icon}
 </div>
 <div className="flex-1">
 <h3 className="text-sm font-bold text-mono-text">{s.name}</h3>
 <p className="text-xs font-medium text-mono-muted mt-0.5">{s.desc}</p>
 </div>
 <ChevronRight size={16} className="text-mono-muted" />
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Right Column (Progress & Help) */}
 <div className="space-y-6">
 {/* Request Progress */}
 <div className="bg-mono-bg rounded-2xl border border-mono-border p-6 shadow-sm">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-lg font-bold text-mono-text">Request progress</h2>
 <button className="text-sm font-bold text-mono-text flex items-center gap-1 hover:opacity-70">
 View details <ArrowRight size={16} />
 </button>
 </div>
 <div className="border border-mono-border rounded-xl p-4 mb-6 flex items-start gap-4">
 <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <FileText size={20} strokeWidth={1.5} />
 </div>
 <div className="flex-1">
 <div className="flex justify-between items-start">
 <div>
 <h3 className="font-bold text-mono-text text-sm">Income Certificate</h3>
 <p className="text-xs font-medium text-mono-muted mt-0.5">#REQ-2025-00124</p>
 </div>
 <span className="bg-mono-surface text-mono-text text-[10px] font-bold px-2 py-1 rounded-full">Action Required</span>
 </div>
 </div>
 </div>
 
 <div className="relative mb-8 mt-2 px-2">
 <div className="absolute top-2 left-4 right-4 h-0.5 bg-mono-border"></div>
 <div className="absolute top-2 left-4 w-1/3 h-0.5 bg-mono-text"></div>
 <div className="flex justify-between relative z-10">
 <div className="flex flex-col items-center gap-2">
 <div className="w-4 h-4 rounded-full bg-mono-text border-4 border-mono-bg ring-1 ring-mono-text"></div>
 <p className="text-[10px] font-bold text-mono-text">Submitted</p>
 <p className="text-[9px] font-medium text-mono-muted">10 Sep 2025</p>
 </div>
 <div className="flex flex-col items-center gap-2">
 <div className="w-4 h-4 rounded-full bg-mono-text border-4 border-mono-bg ring-1 ring-mono-text"></div>
 <p className="text-[10px] font-bold text-mono-text">Under Review</p>
 <p className="text-[9px] font-medium text-mono-muted">11 Sep 2025</p>
 </div>
 <div className="flex flex-col items-center gap-2">
 <div className="w-4 h-4 rounded-full bg-mono-surface border-2 border-mono-border"></div>
 <p className="text-[10px] font-medium text-mono-muted">Processing</p>
 </div>
 <div className="flex flex-col items-center gap-2">
 <div className="w-4 h-4 rounded-full bg-mono-surface border-2 border-mono-border"></div>
 <p className="text-[10px] font-medium text-mono-muted">Completed</p>
 </div>
 </div>
 </div>
 
 <div className="bg-mono-surface rounded-xl p-4 flex gap-3 items-start">
 <Info size={16} className="text-mono-text mt-0.5 shrink-0" />
 <div>
 <p className="text-sm font-bold text-mono-text">Your request is under review.</p>
 <p className="text-xs font-medium text-mono-muted mt-1">We will notify you once there is an update.</p>
 </div>
 </div>
 </div>

 {/* Quick Help */}
 <div className="bg-mono-bg rounded-2xl border border-mono-border p-6 shadow-sm">
 <h2 className="text-lg font-bold text-mono-text mb-6">Quick help</h2>
 <div className="space-y-4">
 {[
 { title: 'Check request status', desc: 'Track your application in real time', icon: <Search size={18}/> },
 { title: 'Find a service', desc: 'Browse all available services', icon: <Search size={18}/> },
 { title: 'FAQs', desc: 'Get answers to common questions', icon: <HelpCircle size={18}/> },
 { title: 'Contact support', desc: 'Need assistance? We\'re here to help.', icon: <PhoneCall size={18}/> }
 ].map((h, idx) => (
 <div key={idx} className="flex items-start gap-4 cursor-pointer hover:bg-mono-surface p-2 -mx-2 rounded-lg transition-colors">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 {h.icon}
 </div>
 <div>
 <h3 className="text-sm font-bold text-mono-text">{h.title}</h3>
 <p className="text-xs font-medium text-mono-muted mt-0.5">{h.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 </div>
 );
}
