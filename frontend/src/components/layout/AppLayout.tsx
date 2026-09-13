import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut, FileSearch, UserCircle, Bell, LifeBuoy, Menu, X } from 'lucide-react';
import clsx from 'clsx';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let navItems: Array<{ name: string; path: string; icon: any }> = [];
  if (user?.role === 'citizen') {
    navItems = [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Services', path: '/services', icon: FileSearch },
      { name: 'My Requests', path: '/requests', icon: FileText },
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Support', path: '/support', icon: LifeBuoy },
      { name: 'Profile', path: '/profile', icon: UserCircle },
    ];
  } else if (user?.role === 'centre_employee') {
    navItems = [
      { name: 'Queue', path: '/queue', icon: LayoutDashboard },
      { name: 'Support Tickets', path: '/support', icon: LifeBuoy },
    ];
  } else if (user?.role === 'centre_administrator') {
    navItems = [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Queue', path: '/queue', icon: FileText },
      { name: 'Escalations', path: '/admin/escalations', icon: Bell },
      { name: 'Support Tickets', path: '/support', icon: LifeBuoy },
    ];
  } else if (user?.role === 'system_administrator') {
    navItems = [
      { name: 'Dashboard', path: '/sysadmin/dashboard', icon: LayoutDashboard },
      { name: 'Centres', path: '/sysadmin/centres', icon: FileText },
      { name: 'Audit Logs', path: '/sysadmin/audit', icon: FileSearch },
    ];
  }

  return (
    <div className="flex h-screen bg-[#faf5ff] text-slate-900 overflow-hidden">
      {/* Mobile header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-indigo-950 flex items-center justify-between px-4 z-20">
        <h1 className="text-xl font-bold text-white tracking-tight">Akshaya</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "fixed md:static inset-y-0 left-0 w-64 bg-indigo-950 text-white flex flex-col z-30 transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold text-white tracking-tight">Akshaya</h1>
          <p className="text-indigo-300 text-sm mt-1">Service Assistance</p>
        </div>
        
        {/* Mobile sidebar header */}
        <div className="p-4 md:hidden flex justify-between items-center border-b border-indigo-900">
           <div>
             <h1 className="text-lg font-bold text-white tracking-tight">Akshaya</h1>
             <p className="text-indigo-300 text-xs mt-0.5">Service Assistance</p>
           </div>
           <button onClick={() => setIsMobileMenuOpen(false)} className="text-indigo-200">
             <X size={20} />
           </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-indigo-900 text-white' 
                    : 'text-indigo-200 hover:bg-indigo-900/50 hover:text-white'
                )}
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
            <p className="text-xs text-indigo-300 capitalize">{user?.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-indigo-900/50 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto md:mt-0 mt-16">
        <main className="p-4 md:p-8 max-w-6xl mx-auto h-full">
          {children}
        </main>
      </div>
    </div>
  );
}