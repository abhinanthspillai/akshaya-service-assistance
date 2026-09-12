import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ChevronRight, AlertCircle, Search, Plus } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  ACCEPTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  UNABLE_TO_PROCEED: 'bg-red-100 text-red-800 border-red-200',
  CORRECTION_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-200',
  INTERACTION_REQUIRED: 'bg-orange-50 text-orange-800 border-orange-200',
  PAYMENT_PENDING: 'bg-pink-50 text-pink-800 border-pink-200'
};

type Tab = 'Active' | 'Needs Attention' | 'Completed' | 'Cancelled';

export function MyRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Active');
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
    const completedStates = ['COMPLETED', 'CLOSED'];
    const cancelledStates = ['CANCELLED', 'UNABLE_TO_PROCEED'];
    const activeStates = ['SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'DRAFT'];

    return requests.filter(r => {
      if (activeTab === 'Active') return activeStates.includes(r.status);
      if (activeTab === 'Needs Attention') return needsAttentionStates.includes(r.status);
      if (activeTab === 'Completed') return completedStates.includes(r.status);
      if (activeTab === 'Cancelled') return cancelledStates.includes(r.status);
      return false;
    });
  };

  const filteredRequests = getFilteredRequests();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <p className="text-slate-500 mt-1">Track and manage your service requests.</p>
        </div>
        <button
          onClick={() => navigate('/services')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 text-sm flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
        {(['Active', 'Needs Attention', 'Completed', 'Cancelled'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors",
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
            )}
          >
            {tab}
            <span className={clsx(
              "ml-2 px-2 py-0.5 rounded-full text-xs",
              activeTab === tab ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
            )}>
              {(() => {
                const needsAttentionStates = ['CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'PAYMENT_PENDING'];
                const completedStates = ['COMPLETED', 'CLOSED'];
                const cancelledStates = ['CANCELLED', 'UNABLE_TO_PROCEED'];
                const activeStates = ['SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'DRAFT'];
                
                return requests.filter(r => {
                  if (tab === 'Active') return activeStates.includes(r.status);
                  if (tab === 'Needs Attention') return needsAttentionStates.includes(r.status);
                  if (tab === 'Completed') return completedStates.includes(r.status);
                  if (tab === 'Cancelled') return cancelledStates.includes(r.status);
                  return false;
                }).length;
              })()}
            </span>
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Search className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No {activeTab.toLowerCase()} requests</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            You don't have any requests in this category right now.
          </p>
          {activeTab === 'Active' && (
            <button
              onClick={() => navigate('/services')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-5 py-2.5 rounded-xl transition-colors border border-indigo-200"
            >
              Browse Services
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <button
              key={req.id}
              onClick={() => navigate(`/requests/${req.id}`)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left flex flex-col h-full group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={clsx(
                  "px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider",
                  STATUS_COLORS[req.status] || 'bg-slate-50 text-slate-600 border-slate-200'
                )}>
                  {req.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Type {req.service_type_snapshot}</span>
              </div>
              
              <h3 className="font-bold text-slate-900 text-lg mb-2 leading-snug group-hover:text-indigo-600 transition-colors">
                {req.service_name_snapshot}
              </h3>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Updated</span>
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(req.updated_at || req.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
