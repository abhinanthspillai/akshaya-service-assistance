import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, CheckCircle, Clock, FileText, CalendarClock, MessageSquare, AlertTriangle } from 'lucide-react';
import { formatStatus } from '../../utils/format';
import clsx from 'clsx';

interface ServiceRequest {
 id: string;
 service_id: string;
 status: string;
 service_name_snapshot: string;
 service_type_snapshot: string;
 fee_snapshot: number | null;
 submitted_at: string | null;
 created_at: string;
}

interface RequestHistory {
 id: string;
 action: string;
 from_status: string | null;
 to_status: string | null;
 created_at: string;
}

 interface RequestDocument {
  id: string;
  original_filename: string;
  requirement_id: string;
  content_type: string;
  version: number;
  is_current: boolean;
  uploaded_at: string;
  status: string;
  employee_remarks: string | null;
 }

interface DocumentReview {
 id: string;
 document_id: string;
 decision: string;
 reason: string | null;
 created_at: string;
}

interface InteractionRequirement {
 id: string;
 name: string;
 description: string | null;
}

interface RequestInteraction {
 id: string;
 status: string;
 reason: string;
 instructions: string | null;
 scheduled_at: string | null;
 outcome_note: string | null;
}

interface RequestMessage {
 id: string;
 sender_id: string;
 body: string;
 created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
 SUBMITTED: 'bg-accent-50 text-blue-600',
 WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800',
 ACCEPTED: 'bg-blue-600/10 text-mono-text',
 UNDER_REVIEW: 'bg-purple-50 text-purple-700',
};

export function RequestWorkspace() {
 const { id } = useParams<{ id: string }>();
 const [request, setRequest] = useState<ServiceRequest | null>(null);
 const [history, setHistory] = useState<RequestHistory[]>([]);
 const [documents, setDocuments] = useState<RequestDocument[]>([]);
 const [reviews, setReviews] = useState<DocumentReview[]>([]);
 const [interactionRequirements, setInteractionRequirements] = useState<InteractionRequirement[]>([]);
 const [interactions, setInteractions] = useState<RequestInteraction[]>([]);
 const [messages, setMessages] = useState<RequestMessage[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [isLoading, setIsLoading] = useState(true);
 const [isAccepting, setIsAccepting] = useState(false);
 const [isStartingReview, setIsStartingReview] = useState(false);
 const [error, setError] = useState('');
 const navigate = useNavigate();

 useEffect(() => {
 const fetchData = async () => {
 try {
 const [reqRes, histRes] = await Promise.all([
 api.get('/requests/' + id),
 api.get('/requests/' + id + '/history')
 ]);
 setRequest(reqRes.data);
 setHistory(histRes.data);
 try {
 const [docsRes, reviewsRes, serviceRes, interactionsRes, messagesRes] = await Promise.all([
 api.get('/requests/' + id + '/documents'),
 api.get('/requests/' + id + '/document-reviews'),
 api.get('/services/' + reqRes.data.service_id),
 api.get('/requests/' + id + '/interactions'),
 api.get('/requests/' + id + '/messages')
 ]);
 setDocuments(docsRes.data);
 setReviews(reviewsRes.data);
 setInteractionRequirements(serviceRes.data.interaction_requirements || []);
 setInteractions(interactionsRes.data || []);
 setMessages(messagesRes.data || []);
 } catch {
 setDocuments([]);
 setReviews([]);
 setInteractions([]);
 setMessages([]);
 }
 } catch {
 setError('Failed to load request workspace.');
 } finally {
 setIsLoading(false);
 }
 };
 if (id) fetchData();
 }, [id]);

 const handleAccept = async () => {
 if (!request) return;
 setIsAccepting(true);
 try {
 const res = await api.post('/requests/' + request.id + '/accept');
 setRequest(res.data);
 const histRes = await api.get('/requests/' + request.id + '/history');
 setHistory(histRes.data);
 const docsRes = await api.get('/requests/' + request.id + '/documents');
 setDocuments(docsRes.data);
 } catch (e) {
 const err = e as { response?: { data?: { detail?: string } } };
 setError(err.response?.data?.detail || 'Failed to accept request.');
 } finally {
 setIsAccepting(false);
 }
 };

 const refreshWorkspace = async (requestId: string) => {
 const [reqRes, histRes, docsRes, reviewsRes, serviceRes, interactionsRes, messagesRes] = await Promise.all([
 api.get('/requests/' + requestId),
 api.get('/requests/' + requestId + '/history'),
 api.get('/requests/' + requestId + '/documents'),
 api.get('/requests/' + requestId + '/document-reviews'),
 request ? api.get('/services/' + request.service_id) : Promise.resolve({ data: { interaction_requirements: [] } }),
 api.get('/requests/' + requestId + '/interactions'),
 api.get('/requests/' + requestId + '/messages')
 ]);
 setRequest(reqRes.data);
 setHistory(histRes.data);
 setDocuments(docsRes.data);
 setReviews(reviewsRes.data);
 setInteractionRequirements(serviceRes.data.interaction_requirements || []);
 setInteractions(interactionsRes.data || []);
 setMessages(messagesRes.data || []);
 };

 const handleStartReview = async () => {
 if (!request) return;
 setIsStartingReview(true);
 try {
 await api.post('/requests/' + request.id + '/start-review');
 await refreshWorkspace(request.id);
 } catch {
 setError('Failed to start document review.');
 } finally {
 setIsStartingReview(false);
 }
 };

 const handleReviewDocument = async (documentId: string, decision: 'APPROVED' | 'REPLACEMENT_REQUESTED') => {
 if (!request) return;
 const reason = decision === 'APPROVED' ? null : window.prompt('Correction reason');
 if (decision !== 'APPROVED' && !reason) return;
 try {
 await api.post('/requests/' + request.id + '/documents/' + documentId + '/review', { decision, reason });
 await refreshWorkspace(request.id);
 } catch {
 setError('Failed to save document review decision.');
 }
 };

 const handleRequireInteraction = async (requirementId: string) => {
 if (!request) return;
 const reason = window.prompt('Reason for required interaction');
 if (!reason) return;
 const instructions = window.prompt('Instructions for the citizen') || null;
 try {
 await api.post('/requests/' + request.id + '/require-interaction', {
 requirement_id: requirementId,
 reason,
 instructions,
 });
 await refreshWorkspace(request.id);
 } catch {
 setError('Failed to require interaction.');
 }
 };

 const handleInteractionOutcome = async (interactionId: string, outcome: 'COMPLETED' | 'MISSED') => {
 if (!request) return;
 const note = window.prompt('Outcome note') || null;
 try {
 await api.post('/requests/' + request.id + '/interactions/' + interactionId + '/outcome', {
 outcome,
 note,
 });
 await refreshWorkspace(request.id);
 } catch {
 setError('Failed to record interaction outcome.');
 }
 };

 const handleSendMessage = async () => {
 if (!request || !newMessage.trim()) return;
 try {
 const res = await api.post('/requests/' + request.id + '/messages', { body: newMessage.trim() });
 setMessages((current) => [...current, res.data]);
 setNewMessage('');
 } catch {
 setError('Failed to send message.');
 }
 };

 const handleRequestAction = async (action: 'mark-ready' | 'start-processing') => {
 if (!request) return;
 try {
 await api.post('/requests/' + request.id + '/' + action);
 await refreshWorkspace(request.id);
 } catch {
 setError('Request action failed.');
 }
 };

 const handleUnableToProceed = async () => {
 if (!request) return;
 const reason = window.prompt('Reason this request cannot proceed');
 if (!reason) return;
 try {
 await api.post('/requests/' + request.id + '/unable-to-proceed', { reason });
 await refreshWorkspace(request.id);
 } catch {
 setError('Failed to mark request unable to proceed.');
 }
 };

 const handleRequestPayment = async () => {
 if (!request) return;
 try {
 await api.post('/requests/' + request.id + '/request-payment');
 await refreshWorkspace(request.id);
 } catch {
 setError('Failed to request mock payment.');
 }
 };

 const handleCompleteRequest = async () => {
 if (!request) return;
 const instructions = window.prompt('Collection instructions for the output');
 if (instructions === null) return;
 try {
 await api.post('/requests/' + request.id + '/complete', { collection_instructions: instructions });
 await refreshWorkspace(request.id);
 } catch (err: unknown) {
 const error = err as { response?: { data?: { detail?: string } } };
 setError(error.response?.data?.detail || 'Failed to complete request.');
 }
 };

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <Loader2 className="animate-spin text-purple-600" size={32} />
 </div>
 );
 }

 if (!request) {
 return (
 <div className="bg-red-600/10 text-red-600 p-4 rounded-[16px] border border-red-600/20">
 {error || 'Request not found.'}
 </div>
 );
 }

 const statusColor = STATUS_COLORS[request.status] || 'bg-mono-bg text-mono-muted';

 return (
 <div>
 <button
 onClick={() => navigate('/queue')}
 className="flex items-center gap-2 text-sm text-mono-muted hover:text-mono-text mb-6 transition-colors"
 >
 <ArrowLeft size={16} />
 Back to Queue
 </button>

 <div className="bg-mono-surface rounded-[16px] border border-mono-border overflow-hidden mb-6">
 <div className="p-8 border-b border-mono-muted/20 bg-white /50 to-white">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <span className={('px-3 py-1 rounded-full text-sm font-medium ' + statusColor)}>
 {formatStatus(request.status)}
 </span>
 <span className="text-sm text-mono-muted">Type {request.service_type_snapshot}</span>
 </div>
 {request.status === 'WAITING_FOR_CENTRE' && (
 <button
 onClick={handleAccept}
 disabled={isAccepting}
 className="bg-ink-900 hover:bg-ink-800 text-white font-semibold px-6 py-3 rounded-[16px] transition-all disabled:opacity-50"
 >
 {isAccepting ? 'Accepting...' : 'Accept Request'}
 </button>
 )}
 {request.status === 'ACCEPTED' && (
 <button
 onClick={handleStartReview}
 disabled={isStartingReview}
 className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2 rounded-[16px] transition-colors disabled:opacity-50"
 >
 {isStartingReview ? 'Starting...' : 'Start Review'}
 </button>
 )}
 {request.status === 'UNDER_REVIEW' && (
 <button
 onClick={() => handleRequestAction('mark-ready')}
 className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-[16px] transition-colors"
 >
 Mark Ready
 </button>
 )}
 {request.status === 'READY_FOR_PROCESSING' && (
 <button
 onClick={() => handleRequestAction('start-processing')}
 className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-[16px] transition-colors"
 >
 Start Processing
 </button>
 )}
 {['UNDER_REVIEW', 'INTERACTION_REQUIRED', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING'].includes(request.status) && (
 <button
 onClick={handleUnableToProceed}
 className="bg-red-600 text-white hover:opacity-90 rounded-full px-5 py-2 transition-all"
 >
 Unable to Proceed
 </button>
 )}
 {request.status === 'PROCESSING' && request.fee_snapshot && (
 <button
 onClick={handleRequestPayment}
 className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-5 py-2 rounded-[16px] transition-colors"
 >
 Request Payment
 </button>
 )}
 {(request.status === 'PROCESSING' || request.status === 'PAYMENT_PENDING') && (
 <button
 onClick={handleCompleteRequest}
 className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-[16px] transition-colors"
 >
 Complete Request
 </button>
 )}
 </div>
 <h1 className="text-2xl font-bold text-indigo-950 mb-2">{request.service_name_snapshot}</h1>
 <div className="text-mono-muted text-sm">
 Created {new Date(request.created_at).toLocaleDateString()}
 </div>
 </div>

 {error && (
 <div className="mx-8 mt-4 p-4 bg-red-600/10 text-red-600 rounded-[16px] border border-red-600/20 text-sm">
 {error}
 </div>
 )}

 <div className="p-8 border-b border-mono-muted/20">
 <h2 className="text-lg font-semibold text-indigo-950 mb-6 flex items-center gap-2">
 <FileText size={20} className="text-mono-text" />
 Documents
 </h2>

 {documents.length === 0 ? (
 <p className="text-mono-muted text-sm">No accessible documents yet.</p>
 ) : (
 <div className="grid gap-3">
 {documents.filter((doc) => doc.is_current).map((doc) => {
 const review = reviews.find((item) => item.document_id === doc.id);
 return (
 <div key={doc.id} className="rounded-[16px] border border-mono-muted/20 bg-mono-bg p-4">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div>
  <div className="font-semibold text-mono-text flex items-center gap-2">
   {doc.original_filename}
   <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", 
     doc.status === 'REJECTED' ? "bg-red-100 text-red-700" :
     doc.status === 'REUPLOAD_REQUIRED' ? "bg-orange-100 text-orange-700" :
     doc.status === 'VERIFIED' ? "bg-green-100 text-green-700" :
     "bg-gray-100 text-gray-700"
   )}>
     {doc.status.replace('_', ' ')}
   </span>
  </div>
  <div className="text-sm text-mono-muted mt-1">
  {doc.content_type} · v{doc.version}
  </div>
  {doc.employee_remarks && (
    <div className="text-sm text-orange-600 mt-2">
      <span className="font-semibold">Remarks:</span> {doc.employee_remarks}
    </div>
  )}
  {review && (
  <div className="text-sm text-mono-muted mt-2">
  Decision: {review.decision}{review.reason ? ' · ' + review.reason : ''}
  </div>
  )}
 </div>
 {request.status === 'UNDER_REVIEW' && !review && (
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => handleReviewDocument(doc.id, 'APPROVED')}
 className="inline-flex items-center gap-2 rounded-[16px] bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
 >
 <CheckCircle size={16} />
 Approve
 </button>
 <button
 onClick={() => handleReviewDocument(doc.id, 'REPLACEMENT_REQUESTED')}
 className="inline-flex items-center gap-2 rounded-[16px] bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600"
 >
 <AlertTriangle size={16} />
 Request Correction
 </button>
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 <div className="p-8 border-b border-mono-muted/20">
 <h2 className="text-lg font-semibold text-indigo-950 mb-6 flex items-center gap-2">
 <CalendarClock size={20} className="text-mono-text" />
 Interactions
 </h2>

 {request.status === 'UNDER_REVIEW' && interactionRequirements.length > 0 && (
 <div className="mb-5 flex flex-wrap gap-2">
 {interactionRequirements.map((requirement) => (
 <button
 key={requirement.id}
 onClick={() => handleRequireInteraction(requirement.id)}
 className="rounded-[16px] bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
 >
 Require {requirement.name}
 </button>
 ))}
 </div>
 )}

 {interactions.length === 0 ? (
 <p className="text-mono-muted text-sm">No interactions requested yet.</p>
 ) : (
 <div className="grid gap-3">
 {interactions.map((interaction) => (
 <div key={interaction.id} className="rounded-[16px] border border-mono-muted/20 bg-mono-bg p-4">
 <div className="font-semibold text-mono-text">{interaction.reason}</div>
 {interaction.instructions && (
 <div className="text-sm text-mono-muted mt-1">{interaction.instructions}</div>
 )}
 <div className="text-sm text-mono-muted mt-2">
 Status: {interaction.status}
 {interaction.scheduled_at ? ' · ' + new Date(interaction.scheduled_at).toLocaleString() : ''}
 </div>
 {request.status === 'INTERACTION_SCHEDULED' && interaction.status === 'SCHEDULED' && (
 <div className="mt-3 flex flex-wrap gap-2">
 <button
 onClick={() => handleInteractionOutcome(interaction.id, 'COMPLETED')}
 className="rounded-[16px] bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
 >
 Mark Completed
 </button>
 <button
 onClick={() => handleInteractionOutcome(interaction.id, 'MISSED')}
 className="rounded-[16px] bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600"
 >
 Mark Missed
 </button>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {request.status !== 'WAITING_FOR_CENTRE' && (
 <div className="p-8 border-b border-mono-muted/20">
 <h2 className="text-lg font-semibold text-indigo-950 mb-6 flex items-center gap-2">
 <MessageSquare size={20} className="text-mono-text" />
 Messages
 </h2>
 <div className="space-y-3 mb-4">
 {messages.length === 0 ? (
 <p className="text-sm text-mono-muted">No request messages yet.</p>
 ) : (
 messages.map((message) => (
 <div key={message.id} className="rounded-[16px] border border-mono-muted/20 bg-mono-bg p-3">
 <div className="text-sm text-mono-text">{message.body}</div>
 <div className="text-xs text-mono-muted mt-1">{new Date(message.created_at).toLocaleString()}</div>
 </div>
 ))
 )}
 </div>
 <div className="flex flex-col gap-2 md:flex-row">
 <input
 value={newMessage}
 onChange={(event) => setNewMessage(event.target.value)}
 className="w-full bg-mono-bg border border-mono-border rounded-[12px] px-4 py-3 text-mono-text focus:outline-none focus:ring-2 focus:ring-ink-900"
 placeholder="Write a request message"
 />
 <button
 onClick={handleSendMessage}
 className="rounded-[16px] bg-mono-text px-4 py-2 text-sm font-medium text-white hover:bg-mono-text"
 >
 Send
 </button>
 </div>
 </div>
 )}

 <div className="p-8">
 <h2 className="text-lg font-semibold text-indigo-950 mb-6 flex items-center gap-2">
 <Clock size={20} className="text-mono-text" />
 Request History
 </h2>
 
 {history.length === 0 ? (
 <p className="text-mono-muted text-sm">No history recorded yet.</p>
 ) : (
 <div className="relative border-l-2 border-blue-600/20 ml-3 space-y-6">
 {history.map((item) => (
 <div key={item.id} className="relative pl-6">
 <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-400"></div>
 <div className="font-medium text-mono-text capitalize">{item.action}</div>
 <div className="text-sm text-mono-muted mt-0.5">
 {new Date(item.created_at).toLocaleString()}
 {item.to_status && ' · Changed to ' + formatStatus(item.to_status)}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
