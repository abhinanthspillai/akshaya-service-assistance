import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, CheckSquare, Settings, FileText, Clock, Users, Info, ChevronRight, HelpCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

interface NotificationItem {
 id: string;
 event_type: string;
 title: string;
 body: string | null;
 is_read: boolean;
 created_at: string;
}

type Tab = 'All' | 'Unread' | 'Requests' | 'Service Updates' | 'System';

export function Notifications() {
 const [notifications, setNotifications] = useState<NotificationItem[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');
 const [activeTab, setActiveTab] = useState<Tab>('All');
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const navigate = useNavigate();

 useEffect(() => {
 const fetchNotifications = async () => {
 try {
 const res = await api.get('/notifications/');
 setNotifications(res.data);
 if (res.data.length > 0) {
 setSelectedId(res.data[0].id);
 }
 
 const hasUnread = res.data.some((n: NotificationItem) => !n.is_read);
 if (hasUnread) {
   await api.post('/notifications/read-all');
   setNotifications(current => current.map(item => ({ ...item, is_read: true })));
   window.dispatchEvent(new Event('notificationsRead'));
 }
 } catch {
 setError('Failed to load notifications.');
 } finally {
 setIsLoading(false);
 }
 };
 fetchNotifications();
 }, []);

 const markRead = async (id: string) => {
 try {
 const res = await api.post('/notifications/' + id + '/read');
 setNotifications((current) => current.map((item) => item.id === id ? res.data : item));
 } catch {
 setError('Failed to mark notification as read.');
 }
 };

 const markAllAsRead = async () => {
 try {
 await api.post('/notifications/read-all');
 setNotifications(current => current.map(item => ({ ...item, is_read: true })));
 window.dispatchEvent(new Event('notificationsRead'));
 } catch {
 setError('Failed to mark all as read.');
 }
 };

 const getCategory = (item: NotificationItem): 'Requests' | 'Service Updates' | 'System' => {
 const lowerEvent = item.event_type.toLowerCase();
 const lowerTitle = item.title.toLowerCase();
 if (lowerEvent.includes('system') || lowerTitle.includes('system')) return 'System';
 if (lowerEvent.includes('service') || lowerTitle.includes('service')) return 'Service Updates';
 return 'Requests';
 };

 const filteredNotifications = useMemo(() => {
 return notifications.filter(n => {
 if (activeTab === 'All') return true;
 if (activeTab === 'Unread') return !n.is_read;
 return getCategory(n) === activeTab;
 });
 }, [notifications, activeTab]);

 const selectedNotification = useMemo(() => {
 return notifications.find(n => n.id === selectedId) || filteredNotifications[0];
 }, [notifications, selectedId, filteredNotifications]);

 const getIconForNotification = (item: NotificationItem) => {
 const lowerTitle = item.title.toLowerCase();
 if (lowerTitle.includes('document')) return <FileText size={18} />;
 if (lowerTitle.includes('review')) return <Clock size={18} />;
 if (lowerTitle.includes('system')) return <Bell size={18} />;
 if (lowerTitle.includes('approve') || lowerTitle.includes('reject')) return <Users size={18} />;
 return <Info size={18} />;
 };

 const formatTimeAgo = (dateStr: string) => {
 const date = new Date(dateStr);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const diffMins = Math.round(diffMs / 60000);
 const diffHours = Math.round(diffMs / 3600000);
 const diffDays = Math.round(diffMs / 86400000);

 if (diffMins < 60) return `${diffMins} mins ago`;
 if (diffHours < 24) return `${diffHours} hours ago`;
 if (diffDays === 1) return `1 day ago`;
 if (diffDays < 7) return `${diffDays} days ago`;
 return `1 week ago`;
 };

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <Loader2 className="animate-spin text-mono-text" size={32} />
 </div>
 );
 }

 const tabs: Tab[] = ['All', 'Unread', 'Requests', 'Service Updates', 'System'];

 return (
 <div className="pb-12">
 {/* Header */}
 <PageHeader 
 title="Notifications"
 subtitle="Stay updated on your requests, services and important updates."
 >
 <div className="flex items-center gap-2">
 <Button 
 variant="ghost"
 onClick={markAllAsRead}
 icon={<CheckSquare size={16} />}
 >
 Mark all as read
 </Button>
 <div className="w-px h-4 bg-mono-border"></div>
 <Button 
 variant="ghost"
 icon={<Settings size={16} />}
 >
 Notification settings
 </Button>
 </div>
 </PageHeader>

 {/* Category Pills */}
 <div className="flex gap-3 overflow-x-auto pb-2 mb-6 hide-scrollbar">
 {tabs.map((tab) => {
 let count = 0;
 if (tab === 'All') count = notifications.length;
 else if (tab === 'Unread') count = notifications.filter(n => !n.is_read).length;
 else count = notifications.filter(n => getCategory(n) === tab).length;

 const isActive = activeTab === tab;

 return (
 <button
 key={tab}
 onClick={() => { setActiveTab(tab); setSelectedId(null); }}
 className={clsx(
 "flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold whitespace-nowrap transition-colors",
 isActive
 ? "bg-mono-text text-mono-bg"
 : "bg-mono-surface text-mono-text hover:bg-mono-border/50"
 )}
 >
 {tab} {count > 0 && `(${count})`}
 </button>
 );
 })}
 </div>

 {error && (
 <div className="bg-mono-surface text-mono-text p-4 rounded-xl mb-6 border border-mono-border text-[14px] flex items-start gap-3">
 <Bell size={20} className="shrink-0 mt-0.5" />
 <span>{error}</span>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Left Pane: Notification List */}
 <div className="lg:col-span-7 xl:col-span-8">
 <Card padding="none">
 {filteredNotifications.length === 0 ? (
 <div className="py-16">
 <EmptyState
 icon={<Bell size={48} />}
 title="No notifications"
 description="You are all caught up."
 />
 </div>
 ) : (
 <ul className="divide-y divide-mono-border/50">
 {filteredNotifications.map((notification) => {
 const isSelected = selectedId === notification.id;
 return (
 <li key={notification.id}>
 <button
 onClick={() => {
 setSelectedId(notification.id);
 if (!notification.is_read) markRead(notification.id);
 }}
 className={clsx(
 "w-full text-left p-5 transition-colors hover:bg-mono-surface/50 flex gap-4 group",
 isSelected ? "bg-mono-surface/50" : "bg-mono-bg"
 )}
 >
 <div className="w-2 pt-3 shrink-0">
 {!notification.is_read && <div className="w-2 h-2 rounded-full bg-mono-text"></div>}
 </div>
 <div className="w-10 h-10 rounded-full bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 {getIconForNotification(notification)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex justify-between items-start mb-1">
 <h3 className={clsx(
 "text-[14px] font-semibold truncate pr-4",
 !notification.is_read ? "text-mono-text" : "text-mono-text/80"
 )}>
 {notification.title}
 </h3>
 <span className="text-[12px] font-medium text-mono-muted whitespace-nowrap shrink-0">
 {formatTimeAgo(notification.created_at)}
 </span>
 </div>
 <p className="text-[14px] text-mono-muted font-medium line-clamp-1 mb-2">
 {notification.body || 'No description provided.'}
 </p>
 <span className="inline-block px-3 py-1 bg-mono-surface text-mono-text text-[11px] font-semibold rounded-md">
 {getCategory(notification)}
 </span>
 </div>
 <div className="flex items-center pl-2">
 <ChevronRight size={18} className={clsx(
 "transition-colors",
 isSelected ? "text-mono-text" : "text-mono-muted group-hover:text-mono-text/50"
 )} />
 </div>
 </button>
 </li>
 );
 })}
 </ul>
 )}
 </Card>
 </div>

 {/* Right Pane: Detail View */}
 <div className="lg:col-span-5 xl:col-span-4">
 {selectedNotification ? (
 <div className="sticky top-6">
 <Card>
 <div className="flex justify-between items-start mb-6">
 <div className="flex gap-4">
 <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 {getIconForNotification(selectedNotification)}
 </div>
 <div>
 <h2 className="text-[18px] font-semibold text-mono-text leading-tight mb-1">{selectedNotification.title}</h2>
 <p className="text-[13px] font-medium text-mono-muted">
 {new Date(selectedNotification.created_at).toLocaleString('en-US', {
 day: 'numeric', month: 'short', year: 'numeric',
 hour: 'numeric', minute: '2-digit', hour12: true
 })}
 </p>
 </div>
 </div>
 <button 
 onClick={() => {
 if (!selectedNotification.is_read) {
 markRead(selectedNotification.id);
 }
 }}
 className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-mono-border text-[12px] font-semibold text-mono-text hover:bg-mono-surface transition-colors shrink-0"
 >
 <div className={clsx(
 "w-2 h-2 rounded-full",
 !selectedNotification.is_read ? "bg-mono-text" : "bg-mono-muted"
 )}></div>
 {!selectedNotification.is_read ? "Unread" : "Read"}
 </button>
 </div>

 <div className="text-[14px] text-mono-muted font-medium mb-8 leading-relaxed">
 {selectedNotification.body || 'No detailed description provided for this notification.'}
 </div>

 {(getCategory(selectedNotification) === 'Requests' || selectedNotification.title.includes('Document')) && (
 <div className="bg-mono-surface rounded-xl p-4 mb-6">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-full bg-mono-bg flex items-center justify-center text-mono-text shrink-0">
 <FileText size={14} />
 </div>
 <div>
 <h4 className="text-[14px] font-semibold text-mono-text mb-1">Required Action</h4>
 <p className="text-[13px] font-medium text-mono-muted">Please review the request details and take necessary action to proceed.</p>
 </div>
 </div>
 </div>
 )}

 <div className="mb-8">
 <Button 
 onClick={() => navigate('/requests')}
 className="w-full justify-center"
 >
 Go to Request <ExternalLink size={16} />
 </Button>
 </div>

 <div className="border-t border-mono-border pt-6 flex items-start gap-3">
 <HelpCircle size={18} className="text-mono-text shrink-0 mt-0.5" />
 <div>
 <h4 className="text-[14px] font-semibold text-mono-text mb-1">Need help?</h4>
 <p className="text-[13px] font-medium text-mono-muted mb-2">If you're unsure about the required documents, visit our Help & Support section.</p>
 <button 
 onClick={() => navigate('/support')}
 className="flex items-center gap-1 text-[13px] font-semibold text-mono-text hover:underline"
 >
 Go to Help & Support <ArrowRight size={14} />
 </button>
 </div>
 </div>
 </Card>
 </div>
 ) : (
 <div className="sticky top-6">
 <Card className="h-64 flex flex-col items-center justify-center text-center">
 <Bell className="text-mono-muted mb-3" size={32} />
 <p className="text-[14px] font-medium text-mono-muted">Select a notification to view details</p>
 </Card>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
