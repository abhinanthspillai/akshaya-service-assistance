import { LifeBuoy, Mail, Phone } from 'lucide-react';

export function Support() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
        <p className="text-slate-500 mt-1">Get assistance with your Akshaya services and platform usage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
            <LifeBuoy className="text-indigo-600" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Create Support Ticket</h2>
          <p className="text-slate-500 text-sm mb-6">
            Need help with a specific request or having technical issues? Create a ticket and our support team will assist you.
          </p>
          <button 
            disabled 
            className="w-full bg-slate-100 text-slate-400 font-medium py-2.5 rounded-lg border border-slate-200 cursor-not-allowed"
          >
            Create Ticket (Coming Soon)
          </button>
          <div className="mt-4 text-xs text-slate-400 text-center">
            Backend dependency: Ticketing system is planned for Phase 2.
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={18} className="text-slate-400" />
                <span className="text-sm">1800-425-11800 (Toll Free)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={18} className="text-slate-400" />
                <span className="text-sm">support@akshaya.kerala.gov.in</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-6">
            <h3 className="font-semibold text-indigo-900 mb-2">Frequently Asked Questions</h3>
            <ul className="space-y-3 text-sm text-indigo-800">
              <li>• How do I track my service request?</li>
              <li>• What documents are required for Type C services?</li>
              <li>• How do I interact with my selected Akshaya Centre?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
