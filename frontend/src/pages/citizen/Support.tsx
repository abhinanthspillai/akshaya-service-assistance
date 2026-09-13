import { LifeBuoy, Mail, Phone, Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Link } from 'react-router-dom';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
}

export function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api.get('/tickets/');
        setTickets(res.data);
      } catch (err) {
        console.error('Failed to load tickets', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);
    try {
      const res = await api.post('/tickets/', { subject, description });
      setTickets([...tickets, res.data]);
      setSubject('');
      setDescription('');
    } catch (err) {
      setError('Failed to create ticket.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Help & Support</h1>
        <p className="text-slate-500 mt-1">Get assistance with your Akshaya services and platform usage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
            <LifeBuoy className="text-indigo-600" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Create Support Ticket</h2>
          <p className="text-slate-500 text-sm mb-6">
            Need help with a specific request or having technical issues? Create a ticket and our support team will assist you.
          </p>
          
          <form onSubmit={handleCreateTicket} className="space-y-4 flex-1">
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Brief description of the issue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Provide detailed information..."
              />
            </div>
            <button 
              type="submit"
              disabled={isCreating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Submit Ticket'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Your Tickets</h3>
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-600" /></div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-slate-500">No support tickets found.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-slate-900">{ticket.subject}</div>
                      <span className="text-xs px-2 py-0.5 bg-slate-200 rounded-full font-medium">{ticket.status}</span>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
}
