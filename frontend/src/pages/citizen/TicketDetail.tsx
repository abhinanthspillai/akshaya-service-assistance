import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react';

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

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketRes, messagesRes] = await Promise.all([
          api.get('/tickets/' + id),
          api.get('/tickets/' + id + '/messages')
        ]);
        setTicket(ticketRes.data);
        setMessages(messagesRes.data);
      } catch {
        setError('Failed to load ticket details.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket) return;
    setIsSending(true);
    try {
      const res = await api.post('/tickets/' + ticket.id + '/messages', { body: newMessage.trim() });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch {
      setError('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
        {error || 'Ticket not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <button
        onClick={() => navigate('/support')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Support
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-8 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-200 text-slate-800">
              {ticket.status}
            </span>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
          <div className="text-sm text-slate-500 mt-4 flex gap-4">
            <span>Created on: {new Date(ticket.created_at).toLocaleDateString()}</span>
            {ticket.request_id && <span>Linked Request ID: {ticket.request_id}</span>}
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-indigo-600" />
            Messages
          </h2>

          <div className="space-y-4 mb-6">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet. Support will reply here.</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <p className="text-slate-800">{msg.body}</p>
                  <p className="text-xs text-slate-500 mt-2">{new Date(msg.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>

          {ticket.status !== 'CLOSED' && (
            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                required
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isSending}
                className="self-end bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
