import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, MessageSquare, ChevronDown, ChevronUp, Phone, Mail, MapPin, ArrowRight, Loader2, ArrowLeft, LifeBuoy } from 'lucide-react';
import { api } from '../../lib/api';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';

interface Ticket {
 id: string;
 subject: string;
 description: string;
 status: string;
 created_at: string;
}

const FAQS = [
 {
 question: "How do I apply for a service?",
 answer: "Navigate to the Services page, select the service you need, click 'View Details', and follow the step-by-step application process."
 },
 {
 question: "What documents are required?",
 answer: "Required documents vary by service. You can find the exact list of mandatory documents on the specific service's detail page before applying."
 },
 {
 question: "How can I check the status of my request?",
 answer: "Go to the 'My Requests' page. You will see all your active and past requests along with their current status (e.g., In Progress, Completed)."
 },
 {
 question: "Can I edit or cancel a submitted request?",
 answer: "Requests can only be edited or cancelled while they are in the 'Draft' or 'Submitted' state before processing begins. Check the 'Actions' column in My Requests."
 },
 {
 question: "How will I be notified about updates?",
 answer: "You will receive real-time alerts in the 'Notifications' tab whenever the status of your request changes or if additional action is required."
 }
];

export function Support() {
 const [view, setView] = useState<'faq' | 'ticket'>('faq');
 const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
 
 const [tickets, setTickets] = useState<Ticket[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isCreating, setIsCreating] = useState(false);
 const [subject, setSubject] = useState('');
 const [description, setDescription] = useState('');
 const [requestId, setRequestId] = useState('');
 const [myRequests, setMyRequests] = useState<Array<{id: string, service_name_snapshot: string}>>([]);
 const [error, setError] = useState('');
 const navigate = useNavigate();

 useEffect(() => {
 const fetchTickets = async () => {
 try {
 const [ticketsRes, requestsRes] = await Promise.all([
 api.get('/tickets/'),
 api.get('/requests/')
 ]);
 setTickets(ticketsRes.data);
 setMyRequests(requestsRes.data);
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
 const payload = { subject, description, request_id: requestId || null };
 const res = await api.post('/tickets/', payload);
 setTickets([res.data, ...tickets]);
 setSubject('');
 setDescription('');
 setRequestId('');
 setView('faq'); // Go back to FAQ after creation
 } catch {
 setError('Failed to create ticket. Please try again.');
 } finally {
 setIsCreating(false);
 }
 };

 return (
 <div className="pb-12">
 {/* Header */}
 <PageHeader 
 title="Help & Support"
 subtitle="Find answers, get help or reach out to our support team."
 />

 {/* Top Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
 <button 
 onClick={() => setView('faq')}
 className="bg-mono-bg p-6 rounded-xl border border-mono-border shadow-sm hover:border-mono-text/30 transition-all text-left flex items-start justify-between group"
 >
 <div className="flex gap-4">
 <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <BookOpen size={20} />
 </div>
 <div>
 <h3 className="font-semibold text-[15px] text-mono-text mb-1">FAQs</h3>
 <p className="text-[13px] font-medium text-mono-muted">Find answers to common questions.</p>
 </div>
 </div>
 <ArrowRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors mt-3" />
 </button>

 <button className="bg-mono-bg p-6 rounded-xl border border-mono-border shadow-sm hover:border-mono-text/30 transition-all text-left flex items-start justify-between group">
 <div className="flex gap-4">
 <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <FileText size={20} />
 </div>
 <div>
 <h3 className="font-semibold text-[15px] text-mono-text mb-1">User Guide</h3>
 <p className="text-[13px] font-medium text-mono-muted">Learn how to use SAHAYA step by step.</p>
 </div>
 </div>
 <ArrowRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors mt-3" />
 </button>

 <button 
 onClick={() => setView('ticket')}
 className="bg-mono-bg p-6 rounded-xl border border-mono-border shadow-sm hover:border-mono-text/30 transition-all text-left flex items-start justify-between group"
 >
 <div className="flex gap-4">
 <div className="w-12 h-12 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <MessageSquare size={20} />
 </div>
 <div>
 <h3 className="font-semibold text-[15px] text-mono-text mb-1">Contact Support</h3>
 <p className="text-[13px] font-medium text-mono-muted">Get help from our support team.</p>
 </div>
 </div>
 <ArrowRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors mt-3" />
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Pane: Dynamic Content */}
 <div className="lg:col-span-2">
 {view === 'faq' ? (
 <Card>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-[18px] font-semibold text-mono-text">Popular Questions</h2>
 <button className="text-[14px] font-semibold text-mono-text flex items-center gap-1 hover:underline">
 View all <ArrowRight size={14} />
 </button>
 </div>
 
 <div className="divide-y divide-mono-border/50 border border-mono-border rounded-lg overflow-hidden">
 {FAQS.map((faq, index) => {
 const isExpanded = expandedFaq === index;
 return (
 <div key={index} className="bg-mono-bg">
 <button
 onClick={() => setExpandedFaq(isExpanded ? null : index)}
 className="w-full flex items-center justify-between p-4 text-left hover:bg-mono-surface/50 transition-colors"
 >
 <span className="font-semibold text-[14px] text-mono-text pr-4">{faq.question}</span>
 {isExpanded ? (
 <ChevronUp size={18} className="text-mono-muted shrink-0" />
 ) : (
 <ChevronDown size={18} className="text-mono-muted shrink-0" />
 )}
 </button>
 {isExpanded && (
 <div className="px-4 pb-4 text-[14px] font-medium text-mono-muted leading-relaxed">
 {faq.answer}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </Card>
 ) : (
 <div className="space-y-6">
 <Card>
 <div className="flex items-center gap-3 mb-6">
 <button 
 onClick={() => setView('faq')}
 className="p-2 rounded-full hover:bg-mono-surface text-mono-muted hover:text-mono-text transition-colors"
 >
 <ArrowLeft size={18} />
 </button>
 <div>
 <h2 className="text-[18px] font-semibold text-mono-text">Raise a Support Ticket</h2>
 <p className="text-[13px] font-medium text-mono-muted mt-1">Need help with a specific request? Describe your issue below.</p>
 </div>
 </div>

 <form onSubmit={handleCreateTicket} className="space-y-5">
 {error && (
 <div className="bg-mono-surface text-mono-text p-4 rounded-xl border border-mono-border text-[14px] flex items-start gap-3">
 <span>{error}</span>
 </div>
 )}
 
 <div>
 <label className="block text-[14px] font-semibold text-mono-text mb-2">Subject</label>
 <Input
 type="text"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 required
 placeholder="Brief description of the issue"
 />
 </div>
 
 <div>
 <label className="block text-[14px] font-semibold text-mono-text mb-2">Link to Request (Optional)</label>
 <Select
 value={requestId}
 onChange={(e) => setRequestId(e.target.value)}
 >
 <option value="">-- No Request Linked --</option>
 {myRequests.map(req => (
 <option key={req.id} value={req.id}>
 {req.service_name_snapshot} ({req.id.substring(0, 8)}...)
 </option>
 ))}
 </Select>
 </div>
 
 <div>
 <label className="block text-[14px] font-semibold text-mono-text mb-2">Description</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 required
 rows={5}
 className="w-full rounded-lg border border-mono-border px-4 py-2 text-[14px] font-medium focus:border-mono-text focus:outline-none transition-colors resize-y bg-mono-bg"
 placeholder="Provide detailed information..."
 />
 </div>
 
 <div className="flex justify-end pt-2">
 <Button 
 type="submit"
 disabled={isCreating}
 >
 {isCreating ? <Loader2 className="animate-spin" size={18} /> : 'Submit Ticket'}
 </Button>
 </div>
 </form>
 </Card>

 {/* Ticket History */}
 <Card>
 <h2 className="text-[18px] font-semibold text-mono-text mb-4">Your Tickets</h2>
 {isLoading ? (
 <div className="flex justify-center p-4"><Loader2 className="animate-spin text-mono-text" /></div>
 ) : tickets.length === 0 ? (
 <div className="py-6 border border-mono-border border-dashed rounded-lg bg-mono-surface/30">
 <EmptyState
 icon={<MessageSquare size={32} />}
 title="No tickets found"
 description="You haven't submitted any support tickets yet."
 />
 </div>
 ) : (
 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
 {tickets.map(ticket => (
 <button 
 key={ticket.id} 
 onClick={() => navigate('/support/' + ticket.id)}
 className="w-full p-4 border border-mono-border rounded-lg bg-mono-bg hover:bg-mono-surface/50 text-left transition-colors"
 >
 <div className="flex justify-between items-start mb-2">
 <div className="font-semibold text-[14px] text-mono-text truncate pr-4">{ticket.subject}</div>
 <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-mono-surface text-mono-text border border-mono-border rounded-md font-semibold shrink-0">
 {ticket.status}
 </span>
 </div>
 <div className="text-[12px] font-medium text-mono-muted">
 Submitted on {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
 </div>
 </button>
 ))}
 </div>
 )}
 </Card>
 </div>
 )}
 </div>

 {/* Right Pane: Contact Support Sidebar */}
 <div className="lg:col-span-1">
 <div className="sticky top-6">
 <Card>
 <h2 className="text-[18px] font-semibold text-mono-text mb-1">Contact Support</h2>
 <p className="text-[13px] font-medium text-mono-muted mb-6">Need more help? Reach out to us.</p>
 
 <div className="space-y-6 mb-8">
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <Phone size={18} />
 </div>
 <div>
 <h4 className="text-[14px] font-semibold text-mono-text mb-1">Call Us</h4>
 <p className="text-[14px] font-semibold text-mono-text mb-0.5">1800 123 4567</p>
 <p className="text-[12px] font-medium text-mono-muted">Mon - Fri, 9:00 AM - 6:00 PM</p>
 </div>
 </div>
 
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <Mail size={18} />
 </div>
 <div>
 <h4 className="text-[14px] font-semibold text-mono-text mb-1">Email Us</h4>
 <p className="text-[14px] font-semibold text-mono-text mb-0.5">support@sahaya.gov.in</p>
 <p className="text-[12px] font-medium text-mono-muted">We usually respond within 24 hours</p>
 </div>
 </div>
 
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-xl bg-mono-surface flex items-center justify-center text-mono-text shrink-0">
 <MapPin size={18} />
 </div>
 <div>
 <h4 className="text-[14px] font-semibold text-mono-text mb-1">Visit a Service Center</h4>
 <p className="text-[12px] font-medium text-mono-muted mb-2">Find your nearest center</p>
 <button className="text-[12px] font-semibold text-mono-text hover:underline flex items-center gap-1">
 View centers <ArrowRight size={12} />
 </button>
 </div>
 </div>
 </div>

 <Button 
 onClick={() => setView('ticket')}
 className="w-full justify-center"
 >
 <LifeBuoy size={16} className="mr-2" /> Raise a Support Ticket
 </Button>
 </Card>
 </div>
 </div>
 </div>
 </div>
 );
}
