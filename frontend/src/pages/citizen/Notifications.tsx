import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface NotificationItem {
  id: string;
  event_type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications/');
        setNotifications(res.data);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-indigo-950 flex items-center gap-2">
          <Bell size={24} className="text-purple-600" />
          Notifications
        </h1>
        <p className="text-slate-500 mt-1">Request updates and required actions</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-100">{error}</div>
      )}

      {notifications.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
          <Bell className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No notifications</h3>
          <p className="text-slate-500">You are all caught up.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <li key={notification.id} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{notification.title}</span>
                      {!notification.is_read && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          New
                        </span>
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-sm text-slate-600 mt-1">{notification.body}</p>
                    )}
                    <div className="text-xs text-slate-500 mt-2">
                      {notification.event_type} · {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="rounded-lg border border-purple-200 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
