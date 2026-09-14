import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Loader2, LifeBuoy, MessageSquare } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  request_id: string | null;
  created_at: string;
}

interface TicketMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function SupportAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api.get('/tickets/');
        setTickets(res.data);
      } catch {
        setError('Failed to load tickets.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
    try {
      const res = await api.get('/tickets/' + ticket.id + '/messages');
      setMessages(res.data);
    } catch {
      setError('Failed to load ticket messages.');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const res = await api.post('/tickets/' + selectedTicket.id + '/status', { status });
      setSelectedTicket(res.data);
      setTickets(tickets.map(t => t.id === res.data.id ? res.data : t));
    } catch {
      setError('Failed to update status.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    setIsSending(true);
    try {
      const res = await api.post('/tickets/' + selectedTicket.id + '/messages', { body: newMessage.trim() });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch {
      setError('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && tickets.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
          <LifeBuoy className="text-indigo-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-slate-500 mt-1">Manage and respond to citizen support queries</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900">
            All Tickets
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {tickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={("p-3 rounded-xl border transition-colors cursor-pointer " + (selectedTicket?.id === ticket.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'))}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-sm text-slate-900 line-clamp-1">{ticket.subject}</div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-full font-medium text-slate-600">
                    {ticket.status}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">No tickets found.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-slate-900">{selectedTicket.subject}</h2>
                  <select 
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="rounded-lg border border-slate-200 text-sm font-medium px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                {selectedTicket.request_id && (
                  <div className="mt-4 text-xs font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded">
                    Linked Request: {selectedTicket.request_id}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No messages in this ticket.</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                      <p className="text-slate-800 text-sm">{msg.body}</p>
                      <p className="text-xs text-slate-500 mt-2">{new Date(msg.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    required
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>Select a ticket from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
