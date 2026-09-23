import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, Search, ArrowRight, Loader2, Plus, Clock, FileEdit, HelpCircle, PhoneCall, ChevronRight, Info } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

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
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState(false);
  const [servicesError, setServicesError] = useState(false);

  const fetchRequests = async () => {
    setRequestsError(false);
    try {
      // Add trailing slash to prevent 307 redirect which causes CORS Network Error via Vite proxy
      const res = await api.get('/requests/');
      setRequests(res.data || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setRequestsError(true);
    }
  };

  const fetchPopularServices = async () => {
    setServicesError(false);
    try {
      const res = await api.get('/services/popular');
      setPopularServices(res.data || []);
    } catch (error) {
      console.error("Failed to fetch popular services:", error);
      setServicesError(true);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchRequests(),
      fetchPopularServices()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
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

  const getStatusText = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  // Dynamic data for Recent Activity
  const recentActivities = [...requests]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4)
    .map((r, i) => ({
      title: `Request ${getStatusText(r.status)}`,
      subtitle: `${r.service_name_snapshot} #${r.id.substring(0, 8)}`,
      time: new Date(r.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      active: i === 0
    }));

  return (
  <div className="space-y-6 pb-12">
  {/* Header Area */}
  <PageHeader 
  title={`Good morning, ${user?.full_name || 'User'}`}
  subtitle="Here's a quick overview of your requests."
  >
  <Button onClick={() => navigate('/services')} icon={<Plus size={18} strokeWidth={2.5} />}>
  New Request
  </Button>
  </PageHeader>

 {/* Primary Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigate('/requests')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <FileText size={20} />
 </div>
 <p className="text-[15px] font-semibold text-mono-text">Needs Action</p>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{needsActionRequests.length}</span>
 <p className="text-[13px] text-mono-muted mt-1">Requires your attention</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </Card>

 <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigate('/requests')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <Clock size={20} />
 </div>
 <p className="text-[15px] font-semibold text-mono-text">In Progress</p>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{inProgressRequests.length}</span>
 <p className="text-[13px] text-mono-muted mt-1">Being processed</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </Card>

 <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigate('/requests')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <CheckCircle size={20} />
 </div>
 <p className="text-[15px] font-semibold text-mono-text">Completed</p>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{completedRequests.length}</span>
 <p className="text-[13px] text-mono-muted mt-1">Successfully resolved</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </Card>

 <Card padding="md" className="hover:border-mono-text/30 cursor-pointer transition-colors" onClick={() => navigate('/requests')}>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text">
 <FileEdit size={20} />
 </div>
 <p className="text-[15px] font-semibold text-mono-text">Drafts</p>
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 <span className="text-3xl font-bold text-mono-text">{draftRequests.length}</span>
 <p className="text-[13px] text-mono-muted mt-1">Not yet submitted</p>
 </div>
 <ChevronRight size={20} className="text-mono-muted" />
 </div>
 </Card>
 </div>

 {/* Main Area */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column (Attention & Timeline) */}
  <div className="lg:col-span-2 space-y-6">
  {/* Requests requiring attention */}
  <Card padding="md">
  <div className="flex items-center justify-between mb-6">
  <h2 className="text-[18px] font-semibold text-mono-text">Requests requiring your attention</h2>
  <button onClick={() => navigate('/requests')} className="text-[14px] font-semibold text-mono-text flex items-center gap-1 hover:opacity-70 transition-opacity">
  View all <ArrowRight size={16} />
  </button>
  </div>
  
  {requestsError ? (
    <div className="py-8 flex flex-col items-center justify-center border border-mono-border rounded-xl bg-mono-surface/30">
      <AlertCircle className="text-mono-text mb-2" size={24} strokeWidth={1.5} />
      <p className="text-mono-muted text-[13px] font-medium mb-3">Failed to load requests.</p>
      <Button onClick={fetchRequests} size="sm">Retry</Button>
    </div>
  ) : needsActionRequests.length === 0 ? (
  <div className="py-8 border border-mono-border border-dashed rounded-xl bg-mono-surface/30">
    <EmptyState 
      icon={<CheckCircle size={32} />} 
      title="All caught up" 
      description="You don't have any requests that require your attention right now." 
    />
  </div>
  ) : (
  <div className="space-y-4">
    {needsActionRequests.map(req => (
      <div key={req.id} className="border border-mono-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
            <AlertCircle size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-mono-text text-[15px]">{req.service_name_snapshot}</h3>
            <p className="text-[14px] text-mono-muted mt-0.5">#{req.id.substring(0, 8)}...</p>
            <p className="text-[12px] text-mono-muted mt-2 flex items-center gap-1">
              <Clock size={12} /> Updated {new Date(req.updated_at).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <span className="bg-mono-surface text-mono-text text-[12px] font-semibold px-3 py-1 rounded-full w-fit">Action Required</span>
          <p className="text-[12px] text-mono-muted sm:text-right">{req.status === 'PAYMENT_PENDING' ? 'Payment required' : 'Provide additional details'}</p>
        </div>
        <Button onClick={() => navigate(`/requests/${req.id}`)} className="w-full sm:w-auto">
          {req.status === 'PAYMENT_PENDING' ? 'Pay Now' : 'Update'}
        </Button>
      </div>
    ))}
  </div>
  )}
  </Card>

 {/* Recent Activity & Popular Services */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card padding="md">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-[18px] font-semibold text-mono-text">Recent activity</h2>
 <button onClick={() => navigate('/requests')} className="text-[14px] font-semibold text-mono-text flex items-center gap-1 hover:opacity-70 transition-opacity">
 View all <ArrowRight size={16} />
 </button>
 </div>
  <div className="relative pl-3">
  <div className="absolute top-2 bottom-2 left-3 w-px bg-mono-border"></div>
  {requestsError ? (
    <div className="py-8 pl-8 flex flex-col items-start">
      <p className="text-mono-muted text-[13px] font-medium mb-3">Failed to load timeline.</p>
      <Button onClick={fetchRequests} size="sm">Retry</Button>
    </div>
  ) : recentActivities.length === 0 ? (
    <div className="py-8 pl-8 text-center text-mono-muted text-[13px] font-medium">
      No recent activity.<br/>Your request activity will appear here.
    </div>
  ) : (
    <div className="space-y-6">
    {recentActivities.map((act, idx) => (
    <div key={idx} className="relative pl-6">
    <div className={clsx("absolute left-[-5px] top-1.5 w-3 h-3 rounded-full border-2 border-mono-bg", act.active ? "bg-mono-text" : "bg-mono-border")}></div>
    <div className="flex justify-between items-start gap-4">
    <div>
    <p className={clsx("text-[14px]", act.active ? "font-semibold text-mono-text" : "text-mono-muted")}>{act.title}</p>
    <p className="text-[13px] text-mono-muted mt-1">{act.subtitle}</p>
    </div>
    <span className="text-[12px] text-mono-muted whitespace-nowrap">{act.time}</span>
    </div>
    </div>
    ))}
    </div>
  )}
  </div>
 </Card>

 <Card padding="md">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-[18px] font-semibold text-mono-text">Popular services</h2>
 <button onClick={() => navigate('/services')} className="text-[14px] font-semibold text-mono-text flex items-center gap-1 hover:opacity-70 transition-opacity">
 View all <ArrowRight size={16} />
 </button>
 </div>
  <div className="space-y-4">
  {servicesError ? (
    <div className="py-8 flex flex-col items-center justify-center">
      <AlertCircle className="text-mono-text mb-2" size={24} strokeWidth={1.5} />
      <p className="text-mono-muted text-[13px] font-medium mb-3">Failed to load popular services.</p>
      <Button onClick={fetchPopularServices} size="sm">Retry</Button>
    </div>
  ) : popularServices.length === 0 ? (
    <div className="py-4 text-center text-mono-muted text-[13px] font-medium">
      No popular services available.
    </div>
  ) : (
    popularServices.map((s) => (
      <div key={s.id} onClick={() => navigate(`/services/${s.id}`)} className="flex items-center gap-4 cursor-pointer hover:bg-mono-surface p-2 -mx-2 rounded-lg transition-colors">
        <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
          <FileText size={20} strokeWidth={1.5}/>
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-[14px] font-semibold text-mono-text truncate">{s.name}</h3>
          <p className="text-[12px] text-mono-muted mt-0.5 truncate">{s.description || 'Apply now'}</p>
        </div>
        <ChevronRight size={16} className="text-mono-muted shrink-0" />
      </div>
    ))
  )}
  </div>
 </Card>
 </div>
 </div>

 {/* Right Column (Progress & Help) */}
 <div className="space-y-6">
 {/* Request Progress */}
  <Card padding="md">
  <div className="flex items-center justify-between mb-6">
  <h2 className="text-[18px] font-semibold text-mono-text">Request progress</h2>
  <button onClick={() => navigate('/requests')} className="text-[14px] font-semibold text-mono-text flex items-center gap-1 hover:opacity-70 transition-opacity">
  View details <ArrowRight size={16} />
  </button>
  </div>
  
  {requestsError ? (
    <div className="py-8 flex flex-col items-center justify-center border border-mono-border rounded-xl bg-mono-surface/30">
      <p className="text-mono-muted text-[13px] font-medium mb-3">Failed to load request progress.</p>
      <Button onClick={fetchRequests} size="sm">Retry</Button>
    </div>
  ) : inProgressRequests.length === 0 ? (
  <div className="py-8 border border-mono-border border-dashed rounded-xl bg-mono-surface/30">
    <EmptyState 
      icon={<Clock size={32} />} 
      title="No active requests" 
      description="Your request progress will appear here." 
    />
  </div>
  ) : (
  <>
  {(() => {
    const req = inProgressRequests[0];
    const isProcessing = ['ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING'].includes(req.status);
    const isCompleted = ['COMPLETED', 'CLOSED'].includes(req.status);
    return (
    <>
      <div className="border border-mono-border rounded-xl p-4 mb-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
      <FileText size={20} strokeWidth={1.5} />
      </div>
      <div className="flex-1">
      <div className="flex justify-between items-start">
      <div>
      <h3 className="font-semibold text-mono-text text-[14px]">{req.service_name_snapshot}</h3>
      <p className="text-[12px] text-mono-muted mt-0.5">#{req.id.substring(0, 8)}...</p>
      </div>
      <span className="bg-mono-surface text-mono-text text-[10px] font-semibold px-2 py-1 rounded-full uppercase">{getStatusText(req.status)}</span>
      </div>
      </div>
      </div>
      
      <div className="relative mb-8 mt-2 px-2">
      <div className="absolute top-2 left-4 right-4 h-0.5 bg-mono-border"></div>
      <div className={clsx("absolute top-2 left-4 h-0.5 bg-mono-text", isCompleted ? "w-full" : isProcessing ? "w-1/2" : "w-0")}></div>
      <div className="flex justify-between relative z-10">
      <div className="flex flex-col items-center gap-2">
      <div className="w-4 h-4 rounded-full bg-mono-text border-4 border-mono-bg ring-1 ring-mono-text"></div>
      <p className="text-[10px] font-semibold text-mono-text">Submitted</p>
      </div>
      <div className="flex flex-col items-center gap-2">
      <div className={clsx("w-4 h-4 rounded-full border-4 border-mono-bg ring-1", isProcessing || isCompleted ? "bg-mono-text ring-mono-text" : "bg-mono-surface border-mono-border ring-0")}></div>
      <p className={clsx("text-[10px]", isProcessing || isCompleted ? "font-semibold text-mono-text" : "text-mono-muted")}>Processing</p>
      </div>
      <div className="flex flex-col items-center gap-2">
      <div className={clsx("w-4 h-4 rounded-full border-4 border-mono-bg ring-1", isCompleted ? "bg-mono-text ring-mono-text" : "bg-mono-surface border-mono-border ring-0")}></div>
      <p className={clsx("text-[10px]", isCompleted ? "font-semibold text-mono-text" : "text-mono-muted")}>Completed</p>
      </div>
      </div>
      </div>
      
      <div className="bg-mono-surface rounded-xl p-4 flex gap-3 items-start">
      <Info size={16} className="text-mono-text mt-0.5 shrink-0" />
      <div>
      <p className="text-[14px] font-semibold text-mono-text">Your request is {getStatusText(req.status).toLowerCase()}.</p>
      <p className="text-[13px] text-mono-muted mt-1">We will notify you once there is an update.</p>
      </div>
      </div>
    </>
    );
  })()}
  </>
  )}
  </Card>

 {/* Quick Help */}
 <Card padding="md">
 <h2 className="text-[18px] font-semibold text-mono-text mb-6">Quick help</h2>
 <div className="space-y-4">
 {[
 { title: 'Check request status', desc: 'Track your application in real time', icon: <Search size={18}/>, route: '/requests' },
 { title: 'Find a service', desc: 'Browse all available services', icon: <Search size={18}/>, route: '/services' },
 { title: 'FAQs', desc: 'Get answers to common questions', icon: <HelpCircle size={18}/>, route: '/support' },
 { title: 'Contact support', desc: 'Need assistance? We\'re here to help.', icon: <PhoneCall size={18}/>, route: '/support' }
 ].map((h, idx) => (
 <div key={idx} onClick={() => navigate(h.route)} className="flex items-start gap-4 cursor-pointer hover:bg-mono-surface p-2 -mx-2 rounded-lg transition-colors">
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 {h.icon}
 </div>
 <div>
 <h3 className="text-[14px] font-semibold text-mono-text">{h.title}</h3>
 <p className="text-[12px] text-mono-muted mt-0.5">{h.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </Card>
 </div>
 </div>
 </div>
 );
}
