import { useNavigate } from 'react-router-dom';
import { Shield, LifeBuoy, FileText, Users } from 'lucide-react';

export function SysAdminDashboard() {
 const navigate = useNavigate();

 return (
 <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="text-3xl font-bold text-mono-text">System Administration</h1>
 <p className="text-mono-muted mt-1">Manage global platform settings, services, and security</p>
 </div>
 <span className="px-4 py-2 bg-blue-600/10 text-mono-text font-medium rounded-full text-sm">
 SysAdmin Role
 </span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 
 <button
 onClick={() => navigate('/admin/audit')}
 className="bg-white p-6 rounded-[16px] shadow-sm border border-mono-muted/20 hover: hover:border-ink-300 transition-all text-left flex flex-col group"
 >
 <div className="w-12 h-12 bg-mono-bg rounded-[16px] flex items-center justify-center mb-4 group-hover:bg-mono-text group-hover:text-white transition-colors">
 <Shield size={24} />
 </div>
 <h3 className="text-lg font-bold text-mono-text mb-2">Audit Logs</h3>
 <p className="text-mono-muted text-sm">
 View system-wide security logs, administrative actions, and access trails.
 </p>
 </button>

 <button
 onClick={() => navigate('/admin/support')}
 className="bg-white p-6 rounded-[16px] shadow-sm border border-mono-muted/20 hover: hover:border-indigo-300 transition-all text-left flex flex-col group"
 >
 <div className="w-12 h-12 bg-blue-600/10 text-mono-text rounded-[16px] flex items-center justify-center mb-4 group-hover:bg-mono-text group-hover:text-white transition-colors">
 <LifeBuoy size={24} />
 </div>
 <h3 className="text-lg font-bold text-mono-text mb-2">Support Tickets</h3>
 <p className="text-mono-muted text-sm">
 Manage citizen support queries, view all tickets, and provide assistance.
 </p>
 </button>

 <div className="bg-mono-bg p-6 rounded-[16px] border border-mono-muted/20 opacity-75">
 <div className="w-12 h-12 bg-ink-200 text-mono-muted rounded-[16px] flex items-center justify-center mb-4">
 <FileText size={24} />
 </div>
 <h3 className="text-lg font-bold text-mono-text mb-2 flex items-center gap-2">
 Service Catalogue
 <span className="text-xs bg-ink-200 px-2 py-0.5 rounded-full text-mono-muted">Soon</span>
 </h3>
 <p className="text-mono-muted text-sm">
 Configure new services, update fee structures, and manage required documents.
 </p>
 </div>

 <div className="bg-mono-bg p-6 rounded-[16px] border border-mono-muted/20 opacity-75">
 <div className="w-12 h-12 bg-ink-200 text-mono-muted rounded-[16px] flex items-center justify-center mb-4">
 <Users size={24} />
 </div>
 <h3 className="text-lg font-bold text-mono-text mb-2 flex items-center gap-2">
 Centre & Staff
 <span className="text-xs bg-ink-200 px-2 py-0.5 rounded-full text-mono-muted">Soon</span>
 </h3>
 <p className="text-mono-muted text-sm">
 Register new Akshaya Centres and onboard Centre Administrators.
 </p>
 </div>

 </div>
 </div>
 );
}
