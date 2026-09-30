import { ReactNode, useState, useEffect } from 'react';
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
 const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

 useEffect(() => {
   const handleEsc = (e: KeyboardEvent) => {
     if (e.key === 'Escape') setIsAccountMenuOpen(false);
   };
   window.addEventListener('keydown', handleEsc);
   return () => window.removeEventListener('keydown', handleEsc);
 }, []);

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
 <div className="flex h-screen bg-mono-bg text-mono-text overflow-hidden font-sans">

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
  <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-mono-surface transition-colors group text-left focus:outline-none focus:ring-2 focus:ring-mono-text focus:ring-offset-2 focus:ring-offset-mono-bg">
  <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text font-bold text-sm border border-mono-border shrink-0">
  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
  </div>
  <div className="flex-1 min-w-0">
  <p className="text-sm font-bold text-mono-text truncate group-hover:text-black">{user?.full_name || 'Sample'}</p>
  <p className="text-xs font-medium text-mono-muted capitalize mt-0.5">{user?.role === 'citizen' ? 'Citizen' : user?.role.replace('_', ' ')}</p>
  </div>
  <div className="text-mono-muted group-hover:text-mono-text">
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
 <div className="flex-1 flex flex-col overflow-hidden  bg-mono-bg">
 {/* Unified Header */}
 <header className="sticky top-0 z-20 h-16 border-b border-mono-border bg-mono-bg flex items-center justify-between px-4 md:px-8 shrink-0">
   <div className="flex items-center gap-4">
     <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-mono-text p-2 -ml-2">
       {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
     </button>
     <div className="hidden md:block">
       <h2 className="text-[16px] font-bold text-mono-text">
         Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name ? user.full_name.split(' ')[0] : 'User'}
       </h2>
     </div>
     <div className="md:hidden flex items-center gap-2">
       <h1 className="text-[16px] font-bold text-mono-text uppercase tracking-tight">SAHAYA</h1>
     </div>
   </div>
   
   <div className="flex items-center gap-2 sm:gap-4 relative">
     <button onClick={() => navigate('/notifications')} className="relative p-2 text-mono-text hover:bg-mono-surface rounded-full transition-colors">
       <Bell size={20} strokeWidth={2.5} />
       {unreadCount > 0 && (
         <span className="absolute top-1 right-1 w-4 h-4 bg-mono-text text-mono-bg text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-mono-bg">{unreadCount > 9 ? '9+' : unreadCount}</span>
       )}
     </button>
     <div className="hidden sm:block w-px h-5 bg-mono-border"></div>
     <button 
       onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
       className="flex items-center justify-center w-8 h-8 rounded-full bg-mono-text text-mono-bg text-sm font-bold hover:opacity-90 transition-opacity"
     >
       {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
     </button>

     {/* Dropdown Menu */}
     {isAccountMenuOpen && (
       <>
         <div className="fixed inset-0 z-30" onClick={() => setIsAccountMenuOpen(false)}></div>
         <div className="absolute top-full right-0 mt-2 w-56 bg-mono-bg border border-mono-border rounded-[12px] shadow-sm border-mono-border z-40 overflow-hidden">
           <div className="p-4 border-b border-mono-border bg-mono-surface/30">
             <p className="text-sm font-bold text-mono-text truncate">{user?.full_name || 'User'}</p>
             <p className="text-[11px] font-semibold text-mono-muted tracking-wider uppercase mt-1">{user?.role === 'citizen' ? 'Citizen' : user?.role.replace('_', ' ')}</p>
           </div>
           <div className="p-1.5 bg-mono-bg">
             <button 
               onClick={() => { setIsAccountMenuOpen(false); navigate('/profile'); }}
               className="w-full text-left px-3 py-2.5 text-[14px] font-semibold text-mono-text hover:bg-mono-surface rounded-lg transition-colors"
             >
               My Profile
             </button>
             <button 
               onClick={() => { setIsAccountMenuOpen(false); handleLogout(); }}
               className="w-full text-left px-3 py-2.5 text-[14px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
             >
               Logout
             </button>
           </div>
         </div>
       </>
     )}
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