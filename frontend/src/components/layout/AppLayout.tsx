import { ReactNode, useState, useEffect } from 'react';

import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, LogOut, FileSearch, Bell, LifeBuoy, Menu, X, Search } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../../lib/api';

export function AppLayout({ children }: { children: ReactNode }) {
 const { user, logout } = useAuth();
 const navigate = useNavigate();
 const location = useLocation();
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [unreadCount, setUnreadCount] = useState(0);

 useEffect(() => {
   if (user) {
     api.get('/notifications/?unread_only=true').then(res => {
       setUnreadCount(res.data.length || 0);
     }).catch(() => {
       setUnreadCount(0);
     });

     const handleNotificationsRead = () => setUnreadCount(0);
     window.addEventListener('notificationsRead', handleNotificationsRead);
     return () => window.removeEventListener('notificationsRead', handleNotificationsRead);
   }
 }, [user]);

 const handleLogout = () => {
 logout();
 navigate('/login');
 };

 let navItems: Array<{ name: string; path: string; icon: React.ElementType }> = [];
 if (user?.role === 'citizen') {
 navItems = [
 { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
 { name: 'My Requests', path: '/requests', icon: FileText },
 { name: 'Services', path: '/services', icon: FileSearch },
 { name: 'Notifications', path: '/notifications', icon: Bell },
 { name: 'Help & Support', path: '/support', icon: LifeBuoy },
 ];
 } else if (user?.role === 'centre_employee') {
 navItems = [
 { name: 'Dashboard', path: '/queue', icon: LayoutDashboard },
 { name: 'Requests', path: '/employee/requests', icon: FileText },
 { name: 'Notifications', path: '/notifications', icon: Bell },
 { name: 'Help & Support', path: '/support', icon: LifeBuoy },
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
 <div className="flex h-screen bg-mono-bg text-mono-text overflow-hidden font-sans">
 {/* Mobile header */}
 <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-mono-bg border-b border-mono-border flex items-center justify-between px-4 z-20">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded bg-mono-text"></div>
 <h1 className="text-xl font-bold text-mono-text">SAHAYA</h1>
 </div>
 <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-mono-text p-2">
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
 "fixed md:static inset-y-0 left-0 w-64 bg-mono-bg border-r border-mono-border flex flex-col z-30 transition-transform duration-300 ease-in-out md:translate-x-0",
 isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
 )}>
 <div className="p-6 hidden md:flex items-center gap-3">
 <div>
 <h1 className="text-2xl font-bold text-mono-text leading-tight uppercase tracking-wide">SAHAYA</h1>
 <p className="text-mono-muted text-[11px] font-medium tracking-wide mt-0.5">Service Assistance</p>
 </div>
 </div>
 
 {/* Mobile sidebar header */}
 <div className="p-4 md:hidden flex justify-between items-center border-b border-mono-border">
 <div className="flex items-center gap-3">
 <div>
 <h1 className="text-lg font-bold text-mono-text tracking-tight leading-tight uppercase">SAHAYA</h1>
 <p className="text-mono-muted text-[10px] font-medium tracking-wider mt-0.5">Service Assistance</p>
 </div>
 </div>
 <button onClick={() => setIsMobileMenuOpen(false)} className="text-mono-muted">
 <X size={20} />
 </button>
 </div>
 
 <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto mt-2">
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
 'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all',
 isActive 
 ? 'bg-mono-surface text-mono-text font-bold' 
 : 'text-mono-text hover:bg-mono-surface font-medium'
 )}
 >
 <Icon size={20} className={isActive ? "text-mono-text" : "text-mono-text"} strokeWidth={isActive ? 2.5 : 2} />
 {item.name}
 {item.name === 'Notifications' && unreadCount > 0 && (
   <span className="ml-auto w-5 h-5 bg-mono-text text-mono-bg text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
 )}
 </button>
 );
 })}
 </nav>

 <div className="p-4 mt-auto">
 <button 
 onClick={() => {
 navigate('/profile');
 setIsMobileMenuOpen(false);
 }}
 className="w-full flex items-center gap-3 px-3 py-3 mb-4 rounded-xl hover:bg-mono-surface transition-colors text-left group"
 >
 <Avatar photoUrl={user?.photo_url} name={user?.full_name} className="w-10 h-10 text-sm shrink-0" />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-mono-text truncate" title={user?.full_name || 'Sample'}>{user?.full_name || 'Sample'}</p>
 <p className="text-xs font-medium text-mono-muted capitalize mt-0.5">{user?.role === 'citizen' ? 'Citizen' : user?.role.replace('_', ' ')}</p>
 </div>
 <div className="text-mono-muted opacity-0 group-hover:opacity-100 transition-opacity">
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
 </div>
 </button>
 <button
 onClick={handleLogout}
 className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-mono-text hover:bg-mono-surface transition-colors"
 >
 <LogOut size={20} strokeWidth={2.5} />
 Logout
 </button>
 </div>
 </div>

 {/* Main Content */}
 <div className="flex-1 flex flex-col overflow-hidden md:mt-0 mt-16 bg-mono-bg">
 {/* Desktop Top Bar */}
 <header className="hidden md:flex h-20 border-b border-mono-border items-center justify-between px-8 shrink-0">
 <div className="flex-1"></div>
 <div className="flex items-center gap-4">
 
 
 <button onClick={() => navigate('/notifications')} className="relative p-2 text-mono-text hover:bg-mono-surface rounded-full transition-colors">
 <Bell size={24} strokeWidth={2} />
 {unreadCount > 0 && (
   <span className="absolute top-1 right-1 w-4 h-4 bg-mono-text text-mono-bg text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-mono-bg">{unreadCount}</span>
 )}
 </button>
 <div className="w-px h-6 bg-mono-border"></div>
 <button onClick={() => navigate('/profile')} className="hover:opacity-90 transition-opacity flex items-center justify-center">
 <Avatar photoUrl={user?.photo_url} name={user?.full_name} className="w-8 h-8 text-sm" />
 </button>
 </div>
 </header>

 <div className="flex-1 overflow-auto bg-mono-bg">
 <main className="p-6 max-w-[1400px] mx-auto min-h-full">
 {children}
 </main>
 </div>
 </div>
 </div>
 );
}