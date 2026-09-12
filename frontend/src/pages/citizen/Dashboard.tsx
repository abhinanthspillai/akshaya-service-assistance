import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, Search, ArrowRight, Loader2, Plus, Bell } from 'lucide-react';

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
  const [servicesCount, setServicesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [requestsRes, servicesRes] = await Promise.all([
          api.get('/requests'),
          api.get('/services')
        ]);
        
        setRequests(requestsRes.data || []);
        setServicesCount(servicesRes.data?.length || 0);
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
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // Calculate summaries
  const needsAttentionStates = ['CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'PAYMENT_PENDING'];
  const activeStates = ['SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'DRAFT'];
  const completedStates = ['COMPLETED', 'CLOSED'];

  const activeRequests = requests.filter(r => activeStates.includes(r.status));
  const needsAttentionRequests = requests.filter(r => needsAttentionStates.includes(r.status));
  const completedRequests = requests.filter(r => completedStates.includes(r.status));

  // Get 3 most recent requests
  const recentRequests = [...requests].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 3);

  const formatStatus = (status: string) => status.replace(/_/g, ' ');

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500 rounded-full opacity-20 blur-3xl mix-blend-screen pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name || 'Citizen'}</h1>
          <p className="text-indigo-200 max-w-xl text-lg">
            Access and track Akshaya services through one guided workflow.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link 
              to="/services" 
              className="bg-white text-indigo-900 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Search size={18} />
              Browse Services
            </Link>
            <Link 
              to="/requests" 
              className="bg-indigo-800 text-white border border-indigo-700 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FileText size={18} />
              My Requests
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Active Requests</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{activeRequests.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Needs Attention</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{needsAttentionRequests.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Completed</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{completedRequests.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <Search size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Available Services</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{servicesCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Requests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Requests</h2>
            <Link to="/requests" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={16} />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="mx-auto text-slate-300 mb-3" size={32} />
                <h3 className="text-sm font-medium text-slate-900 mb-1">No requests yet</h3>
                <p className="text-sm text-slate-500 mb-4">Start a new service request to see it here.</p>
                <Link to="/services" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  <Plus size={16} /> Start a Request
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRequests.map(req => (
                  <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate mb-1">{req.service_name_snapshot}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            needsAttentionStates.includes(req.status) ? 'bg-amber-500' :
                            completedStates.includes(req.status) ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}></span>
                          <span className="capitalize font-medium">{formatStatus(req.status)}</span>
                        </span>
                        <span>•</span>
                        <span>Updated {new Date(req.updated_at).toLocaleDateString()}</span>
                        {req.selected_centre_id && (
                          <>
                            <span>•</span>
                            <span>Centre Assigned</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="shrink-0 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <Link to="/notifications" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="text-indigo-400" size={24} />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">You're all caught up!</p>
            <p className="text-xs text-slate-500">
              Future notifications will appear here. (Phase 2)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
