import { Bell } from 'lucide-react';

export function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-slate-500 mt-1">Stay updated on your request progress and centre messages.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="text-indigo-600" size={32} />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">No notifications yet</h2>
        <p className="text-slate-500 max-w-sm mx-auto">
          When you submit a service request, you will receive real-time updates and messages from the Akshaya Centre here.
        </p>
        <div className="mt-6 text-xs text-slate-400 bg-slate-50 inline-block px-3 py-1.5 rounded-md border border-slate-100">
          Backend dependency: Notification service is planned for Phase 2.
        </div>
      </div>
    </div>
  );
}
