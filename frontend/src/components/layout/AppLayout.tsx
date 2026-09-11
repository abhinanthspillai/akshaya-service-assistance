import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut, FileSearch, UserCircle, Bell, LifeBuoy } from 'lucide-react';
import clsx from 'clsx';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Services', path: '/services', icon: FileSearch },
    { name: 'My Requests', path: '/requests', icon: FileText },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Support', path: '/support', icon: LifeBuoy },
    { name: 'Profile', path: '/profile', icon: UserCircle },
  ];

  return (
    <div className="flex h-screen bg-[#faf5ff] text-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-950 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Akshaya</h1>
          <p className="text-indigo-300 text-sm mt-1">Service Assistance</p>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
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
            <p className="text-sm font-medium truncate">{user?.email}</p>
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
      <div className="flex-1 overflow-auto">
        <main className="p-8 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}