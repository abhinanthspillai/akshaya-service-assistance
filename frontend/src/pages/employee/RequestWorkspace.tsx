import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  CalendarClock,
  MessageSquare,
  AlertTriangle,
  Download,
  Send,
  AlertCircle,
  FileCheck,
  CreditCard,
  Building2,
  User,
  History,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { formatStatus } from '../../utils/format';

interface ServiceRequest {
  id: string;
  service_id: string;
  status: string;
  service_name_snapshot: string;
  service_type_snapshot: string;
  fee_snapshot: number | null;
  submitted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  citizen_id: string;
  selected_centre_id: string | null;
}

interface RequestHistory {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
  actor_id: string | null;
}

interface RequestDocument {
  id: string;
  original_filename: string;
  requirement_id: string;
  content_type: string;
  size_bytes: number;
  version: number;
  is_current: boolean;
  uploaded_at: string;
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
  is_mandatory: boolean;
}

interface RequestInteraction {
  id: string;
  requirement_id: string;
  status: string;
  reason: string;
  instructions: string | null;
  scheduled_at: string | null;
  outcome_note: string | null;
  created_at: string;
}

interface RequestPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_reference: string;
  requested_at: string;
  confirmed_at: string | null;
}

interface CompletedOutput {
  id: string;
  request_id: string;
  original_filename: string | null;
  collection_instructions: string | null;
  created_at: string;
}

interface RequestMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  WAITING_FOR_CENTRE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  ACCEPTED: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  UNDER_REVIEW: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  CORRECTION_REQUIRED: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  READY_FOR_PROCESSING: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  PROCESSING: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  PAYMENT_PENDING: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  INTERACTION_REQUIRED: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  INTERACTION_SCHEDULED: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  UNABLE_TO_PROCEED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
};

export function RequestWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [interactionRequirements, setInteractionRequirements] = useState<InteractionRequirement[]>([]);
  const [interactions, setInteractions] = useState<RequestInteraction[]>([]);
  const [payments, setPayments] = useState<RequestPayment[]>([]);
  const [completedOutput, setCompletedOutput] = useState<CompletedOutput | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Interactive Action Modals
  const [activeModal, setActiveModal] = useState<
    'correction' | 'require_interaction' | 'schedule_interaction' | 'unable_to_proceed' | 'complete' | null
  >(null);

  // Modal form states
  const [targetDocId, setTargetDocId] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [targetRequirementId, setTargetRequirementId] = useState<string>('');
  const [interactionReason, setInteractionReason] = useState<string>('');
  const [interactionInstructions, setInteractionInstructions] = useState<string>('');
  const [targetInteractionId, setTargetInteractionId] = useState<string>('');
  const [scheduledAtTime, setScheduledAtTime] = useState<string>('');
  const [unableReason, setUnableReason] = useState<string>('');
  const [collectionInstructions, setCollectionInstructions] = useState<string>(
    'Physical signed document available for collection from the Akshaya Centre during office hours (9 AM - 5 PM). Bring original Aadhaar for verification.'
  );

  const fetchWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      const [reqRes, histRes] = await Promise.all([
        api.get(`/requests/${id}`),
        api.get(`/requests/${id}/history`),
      ]);
      setRequest(reqRes.data);
      setHistory(histRes.data);

      try {
        const [docsRes, reviewsRes, serviceRes, interactionsRes, messagesRes, paymentsRes] =
          await Promise.all([
            api.get(`/requests/${id}/documents`),
            api.get(`/requests/${id}/document-reviews`),
            api.get(`/services/${reqRes.data.service_id}`),
            api.get(`/requests/${id}/interactions`),
            api.get(`/requests/${id}/messages`),
            api.get(`/requests/${id}/payments`),
          ]);
        setDocuments(docsRes.data || []);
        setReviews(reviewsRes.data || []);
        setInteractionRequirements(serviceRes.data.interaction_requirements || []);
        setInteractions(interactionsRes.data || []);
        setMessages(messagesRes.data || []);
        setPayments(paymentsRes.data || []);

        if (reqRes.data.status === 'COMPLETED') {
          try {
            const outRes = await api.get(`/requests/${id}/output`);
            setCompletedOutput(outRes.data);
          } catch {
            setCompletedOutput(null);
          }
        }
      } catch {
        // partial auxiliary failure fallback
      }
      setError('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to load request workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const triggerNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  // State Transition Handlers
  const handleAcceptRequest = async () => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/accept`);
      triggerNotification('Request accepted into your queue.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to accept request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/start-review`);
      triggerNotification('Document review process started.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to start review.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDocumentApproval = async (docId: string) => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/documents/${docId}/review`, {
        decision: 'APPROVED',
        reason: null,
      });
      triggerNotification('Document approved successfully.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to approve document.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const submitCorrectionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !targetDocId || !correctionReason.trim()) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/documents/${targetDocId}/review`, {
        decision: 'REPLACEMENT_REQUESTED',
        reason: correctionReason.trim(),
      });
      setActiveModal(null);
      setCorrectionReason('');
      triggerNotification('Correction requested from citizen.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to submit correction review.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const submitRequireInteractionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !targetRequirementId || !interactionReason.trim()) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/require-interaction`, {
        requirement_id: targetRequirementId,
        reason: interactionReason.trim(),
        instructions: interactionInstructions.trim() || null,
      });
      setActiveModal(null);
      setInteractionReason('');
      setInteractionInstructions('');
      triggerNotification('Interaction requirement sent to citizen.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to require interaction.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const submitScheduleInteractionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !targetInteractionId || !scheduledAtTime) return;
    setIsActionLoading(true);
    try {
      const scheduledUtc = new Date(scheduledAtTime).toISOString();
      await api.post(`/requests/${request.id}/schedule-interaction`, {
        interaction_id: targetInteractionId,
        scheduled_at: scheduledUtc,
      });
      setActiveModal(null);
      setScheduledAtTime('');
      triggerNotification('Interaction appointment confirmed.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to schedule interaction.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleInteractionOutcome = async (interactionId: string, outcome: 'COMPLETED' | 'MISSED') => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/interactions/${interactionId}/outcome`, {
        outcome,
        note: `Interaction marked as ${outcome.toLowerCase()} by centre employee.`,
      });
      triggerNotification(`Interaction recorded as ${outcome}.`);
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to record interaction outcome.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/mark-ready`);
      triggerNotification('Application marked Ready for Processing.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to mark ready.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartProcessing = async () => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/start-processing`);
      triggerNotification('Processing started.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to start processing.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRequestPayment = async () => {
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/request-payment`);
      triggerNotification('Fee payment requested from citizen.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to request payment.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const submitCompleteModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/complete`, {
        collection_instructions: collectionInstructions.trim(),
      });
      setActiveModal(null);
      triggerNotification('Request completed and output delivered.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to complete request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const submitUnableToProceedModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !unableReason.trim()) return;
    setIsActionLoading(true);
    try {
      await api.post(`/requests/${request.id}/unable-to-proceed`, {
        reason: unableReason.trim(),
      });
      setActiveModal(null);
      setUnableReason('');
      triggerNotification('Request marked Unable to Proceed.');
      await fetchWorkspace();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err.response?.data?.detail || 'Failed to mark unable to proceed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadDocument = async (docId: string, filename: string) => {
    if (!request) return;
    try {
      const res = await api.get(`/requests/${request.id}/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to download document file.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !newMessage.trim()) return;
    try {
      const res = await api.post(`/requests/${request.id}/messages`, { body: newMessage.trim() });
      setMessages((current) => [...current, res.data]);
      setNewMessage('');
    } catch {
      setError('Failed to send message.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <Loader2 className="animate-spin text-slate-800" size={36} />
        <span className="text-sm font-medium text-slate-500">Loading Workspace...</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto">
        <AlertCircle size={36} className="text-rose-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-rose-900 mb-1">Request Not Found</h2>
        <p className="text-sm text-rose-700 mb-4">{error || 'This service request does not exist or you lack authorization.'}</p>
        <button
          onClick={() => navigate('/queue')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGES[request.status] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const currentDocs = documents.filter((d) => d.is_current);
  const allDocsApproved =
    currentDocs.length > 0 &&
    currentDocs.every((doc) => {
      const rev = reviews.find((r) => r.document_id === doc.id);
      return rev && rev.decision === 'APPROVED';
    });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/queue')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={14} />
          Back to Request Queue
        </button>

        <span className="text-xs font-mono text-slate-400">
          Ref ID: {request.id}
        </span>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {formatStatus(request.status)}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                Service Type {request.service_type_snapshot}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Fee: {request.fee_snapshot ? `₹${request.fee_snapshot}` : 'Free'}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {request.service_name_snapshot}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
              <span>Submitted: {new Date(request.submitted_at || request.created_at).toLocaleString()}</span>
              <span>•</span>
              <span>Citizen ID: <span className="font-mono text-slate-700">{request.citizen_id.slice(0, 8)}</span></span>
            </div>
          </div>

          {/* Contextual Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {request.status === 'WAITING_FOR_CENTRE' && (
              <button
                onClick={handleAcceptRequest}
                disabled={isActionLoading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                Accept Request
              </button>
            )}

            {request.status === 'ACCEPTED' && (
              <button
                onClick={handleStartReview}
                disabled={isActionLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                Start Document Review
              </button>
            )}

            {request.status === 'UNDER_REVIEW' && (
              <>
                <button
                  onClick={handleMarkReady}
                  disabled={isActionLoading || !allDocsApproved}
                  title={!allDocsApproved ? 'All uploaded documents must be approved before marking ready' : ''}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Check size={14} />
                  Mark Ready for Processing
                </button>

                {interactionRequirements.length > 0 && (
                  <button
                    onClick={() => {
                      setTargetRequirementId(interactionRequirements[0]?.id || '');
                      setActiveModal('require_interaction');
                    }}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-xl transition-all"
                  >
                    Require Citizen Visit
                  </button>
                )}
              </>
            )}

            {request.status === 'READY_FOR_PROCESSING' && (
              <button
                onClick={handleStartProcessing}
                disabled={isActionLoading}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                {isActionLoading && <Loader2 size={14} className="animate-spin" />}
                Start Processing
              </button>
            )}

            {request.status === 'PROCESSING' && (
              <>
                {request.fee_snapshot && Number(request.fee_snapshot) > 0 && (
                  <button
                    onClick={handleRequestPayment}
                    disabled={isActionLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <CreditCard size={14} />
                    Request Fee Payment
                  </button>
                )}

                <button
                  onClick={() => setActiveModal('complete')}
                  disabled={isActionLoading}
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Complete Request
                </button>
              </>
            )}

            {/* Terminal Actions */}
            {['ACCEPTED', 'UNDER_REVIEW', 'READY_FOR_PROCESSING', 'PROCESSING', 'INTERACTION_REQUIRED', 'INTERACTION_SCHEDULED'].includes(
              request.status
            ) && (
              <button
                onClick={() => setActiveModal('unable_to_proceed')}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all"
              >
                Unable to Proceed
              </button>
            )}
          </div>
        </div>

        {/* 1. Document Verification Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-slate-700" />
              Applicant Documents ({currentDocs.length})
            </h2>
            {request.status === 'UNDER_REVIEW' && (
              <span className="text-xs text-slate-500">
                Verify each submitted document below to proceed.
              </span>
            )}
          </div>

          {currentDocs.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500">
              No documents submitted for this request.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {currentDocs.map((doc) => {
                const review = reviews.find((r) => r.document_id === doc.id);
                const isReupload = doc.version > 1;

                return (
                  <div
                    key={doc.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{doc.original_filename}</span>
                        {isReupload && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Re-uploaded (v{doc.version})
                          </span>
                        )}
                        {!isReupload && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                            v{doc.version}
                          </span>
                        )}
                        {review && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              review.decision === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {review.decision === 'APPROVED' ? 'Approved' : 'Correction Requested'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>{doc.content_type}</span>
                        <span>•</span>
                        <span>{Math.round(doc.size_bytes / 1024)} KB</span>
                        <span>•</span>
                        <span>Uploaded {new Date(doc.uploaded_at).toLocaleString()}</span>
                      </div>

                      {review?.reason && (
                        <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100 mt-1">
                          <strong>Note:</strong> {review.reason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.original_filename)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={13} />
                        Download
                      </button>

                      {request.status === 'UNDER_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleDocumentApproval(doc.id)}
                            disabled={isActionLoading}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              review?.decision === 'APPROVED'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Check size={13} />
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              setTargetDocId(doc.id);
                              setActiveModal('correction');
                            }}
                            disabled={isActionLoading}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              review?.decision === 'REPLACEMENT_REQUESTED'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <X size={13} />
                            Request Correction
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Physical / Biometric Interactions Section */}
        {(interactions.length > 0 || interactionRequirements.length > 0) && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CalendarClock size={16} className="text-slate-700" />
              Physical / Biometric Verification
            </h2>

            {interactions.map((int) => (
              <div
                key={int.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">{int.reason}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      {int.status}
                    </span>
                  </div>
                  {int.instructions && (
                    <p className="text-xs text-slate-600 mb-1">
                      <strong>Instructions:</strong> {int.instructions}
                    </p>
                  )}
                  {int.scheduled_at && (
                    <p className="text-xs text-indigo-700 font-semibold">
                      Scheduled for: {new Date(int.scheduled_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {int.status === 'REQUESTED' && (
                    <button
                      onClick={() => {
                        setTargetInteractionId(int.id);
                        setActiveModal('schedule_interaction');
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
                    >
                      Schedule Appointment
                    </button>
                  )}

                  {int.status === 'SCHEDULED' && (
                    <>
                      <button
                        onClick={() => handleInteractionOutcome(int.id, 'COMPLETED')}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleInteractionOutcome(int.id, 'MISSED')}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-200"
                      >
                        Mark Missed
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Output Delivery Section (If Completed) */}
        {request.status === 'COMPLETED' && completedOutput && (
          <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-700" />
              Completed Service Output Details
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {completedOutput.collection_instructions || 'Physical certificate generated and ready for citizen.'}
            </p>
            <div className="text-[11px] text-emerald-600">
              Completed on: {new Date(completedOutput.created_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* 4. Communication & Messaging Stream */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-700" />
            Citizen Clarifications &amp; Messages
          </h2>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No messages exchanged yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                  <p className="text-slate-900">{m.body}</p>
                  <p className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send guidance or clarification to citizen..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400 transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={13} />
              Send
            </button>
          </form>
        </div>

        {/* 5. Request Lifecycle History Audit Trail */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <History size={16} className="text-slate-700" />
            Request Lifecycle Audit Trail
          </h2>

          <div className="relative border-l-2 border-slate-200 ml-3.5 space-y-4 pt-1">
            {history.map((h) => (
              <div key={h.id} className="relative pl-6">
                <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-900" />
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-bold text-slate-900 capitalize">{h.action.replace(/_/g, ' ')}</span>
                  {h.to_status && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      &rarr; {formatStatus(h.to_status)}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 ml-auto">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                {h.note && (
                  <p className="text-xs text-slate-600 mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {h.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: Document Correction */}
      {activeModal === 'correction' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Request Document Correction</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Provide specific instructions for the citizen on why this document was rejected and how to fix it.
            </p>
            <form onSubmit={submitCorrectionModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Quick Templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Document image is blurry / illegible.',
                    'Document is expired; please upload a valid certificate.',
                    'Incorrect document uploaded.',
                    'Missing official seal or signatory signature.',
                  ].map((tmpl) => (
                    <button
                      type="button"
                      key={tmpl}
                      onClick={() => setCorrectionReason(tmpl)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] text-left"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Specific Correction Reason</label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Detail the issue so the applicant can submit a valid version..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !correctionReason.trim()}
                  className="px-4.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Submit Correction Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Require Interaction */}
      {activeModal === 'require_interaction' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Require Citizen Centre Visit</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitRequireInteractionModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Interaction Type</label>
                <select
                  value={targetRequirementId}
                  onChange={(e) => setTargetRequirementId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  {interactionRequirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Reason for Visit</label>
                <input
                  type="text"
                  required
                  value={interactionReason}
                  onChange={(e) => setInteractionReason(e.target.value)}
                  placeholder="e.g. Biometric iris &amp; fingerprint scan required by state portal."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Citizen Instructions (Optional)</label>
                <textarea
                  rows={2}
                  value={interactionInstructions}
                  onChange={(e) => setInteractionInstructions(e.target.value)}
                  placeholder="Bring original documents and appointment confirmation..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !interactionReason.trim()}
                  className="px-4.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirm Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Schedule Interaction */}
      {activeModal === 'schedule_interaction' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Schedule Centre Visit</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitScheduleInteractionModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Date &amp; Time (Local)</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAtTime}
                  onChange={(e) => setScheduledAtTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !scheduledAtTime}
                  className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Unable to Proceed */}
      {activeModal === 'unable_to_proceed' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" />
                Unable to Proceed
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              This action terminates processing for this application and notifies the citizen. Please explain the rejection cause clearly.
            </p>
            <form onSubmit={submitUnableToProceedModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Official Reason</label>
                <textarea
                  required
                  rows={3}
                  value={unableReason}
                  onChange={(e) => setUnableReason(e.target.value)}
                  placeholder="Applicant details mismatch with government database records..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !unableReason.trim()}
                  className="px-4.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Complete Request */}
      {activeModal === 'complete' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Complete Service Delivery
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Mark this request as completed and provide collection instructions or delivery information for the citizen.
            </p>
            <form onSubmit={submitCompleteModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Collection Instructions</label>
                <textarea
                  required
                  rows={3}
                  value={collectionInstructions}
                  onChange={(e) => setCollectionInstructions(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !collectionInstructions.trim()}
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Complete &amp; Deliver Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
