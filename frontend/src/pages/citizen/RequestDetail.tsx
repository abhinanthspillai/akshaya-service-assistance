import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, MapPin, Upload, FileText, CalendarClock, MessageSquare } from 'lucide-react';
import { formatStatus } from '../../utils/format';

interface ServiceRequest {
  id: string;
  service_id: string;
  status: string;
  service_name_snapshot: string;
  service_type_snapshot: string;
  fee_snapshot: number | null;
  submitted_at: string | null;
  created_at: string;
  selected_centre_id: string | null;
}

interface ServiceRequirement {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  max_file_size_bytes: number | null;
  allowed_file_types: Array<{ mime_type: string }>;
}

interface RequestDocument {
  id: string;
  requirement_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  version: number;
  is_current: boolean;
  uploaded_at: string;
}

interface DocumentReview {
  id: string;
  document_id: string;
  requirement_id: string;
  decision: string;
  reason: string | null;
  created_at: string;
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

interface RequestPayment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  provider_reference: string;
}

interface CompletedOutput {
  id: string;
  collection_instructions: string | null;
  created_at: string;
}

interface PreValidationResult {
  is_valid: boolean;
  warnings: string[];
  items: Array<{
    requirement_id: string;
    requirement_name: string;
    status: string;
    messages: string[];
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800',
  ACCEPTED: 'bg-indigo-50 text-indigo-700',
  UNDER_REVIEW: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-green-50 text-green-800',
  CANCELLED: 'bg-red-50 text-red-700',
};

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [reviews, setReviews] = useState<DocumentReview[]>([]);
  const [interactions, setInteractions] = useState<RequestInteraction[]>([]);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [payments, setPayments] = useState<RequestPayment[]>([]);
  const [output, setOutput] = useState<CompletedOutput | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [scheduleValues, setScheduleValues] = useState<Record<string, string>>({});
  const [preValidation, setPreValidation] = useState<PreValidationResult | null>(null);
  const [centres, setCentres] = useState<Array<{ id: string; name: string; district: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingRequirementId, setUploadingRequirementId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/requests/' + (id || ''));
        setRequest(res.data);
        const [serviceRes, documentsRes, reviewsRes, interactionsRes, messagesRes, paymentsRes] = await Promise.all([
          api.get('/services/' + res.data.service_id),
          api.get('/requests/' + res.data.id + '/documents'),
          api.get('/requests/' + res.data.id + '/document-reviews'),
          api.get('/requests/' + res.data.id + '/interactions'),
          api.get('/requests/' + res.data.id + '/messages'),
          api.get('/requests/' + res.data.id + '/payments'),
        ]);
        setRequirements(serviceRes.data.document_requirements || []);
        setDocuments(documentsRes.data || []);
        setReviews(reviewsRes.data || []);
        setInteractions(interactionsRes.data || []);
        setMessages(messagesRes.data || []);
        setPayments(paymentsRes.data || []);
        if (res.data.status === 'DRAFT' || res.data.status === 'CORRECTION_REQUIRED') {
          const validationRes = await api.post('/requests/' + res.data.id + '/pre-validate');
          setPreValidation(validationRes.data);
        }
        if (res.data.status === 'COMPLETED' || res.data.status === 'CLOSED') {
          try {
             // In case there's an endpoint to fetch output, we can do it here, or the api might not have one yet.
             // Actually, I haven't added GET /requests/{id}/output endpoint. Let's just assume we'll add it.
             const outRes = await api.get('/requests/' + res.data.id + '/output');
             setOutput(outRes.data);
          } catch {
      // ignore
    }
        }
        if (res.data.status === 'DRAFT' && res.data.service_id) {
          const centresRes = await api.get('/centres/?active=true');
          setCentres(centresRes.data);
        }
      } catch {
        setError('Failed to load request details.');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleSelectCentre = async (centreId: string) => {
    if (!request) return;
    try {
      const res = await api.post('/requests/' + request.id + '/select-centre', { centre_id: centreId });
      setRequest(res.data);
    } catch {
      setError('Failed to select centre.');
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

  const handleConfirmPayment = async (paymentId: string) => {
    if (!request) return;
    try {
      const res = await api.post('/requests/' + request.id + '/payments/' + paymentId + '/confirm');
      setPayments((current) => current.map((payment) => payment.id === paymentId ? res.data : payment));
      const reqRes = await api.get('/requests/' + request.id);
      setRequest(reqRes.data);
    } catch {
      setError('Mock payment confirmation failed.');
    }
  };

  const handleScheduleInteraction = async (interactionId: string) => {
    if (!request || !scheduleValues[interactionId]) return;
    try {
      const res = await api.post('/requests/' + request.id + '/schedule-interaction', {
        interaction_id: interactionId,
        scheduled_at: new Date(scheduleValues[interactionId]).toISOString(),
      });
      setInteractions((current) => current.map((item) => item.id === interactionId ? res.data : item));
      const reqRes = await api.get('/requests/' + request.id);
      setRequest(reqRes.data);
    } catch {
      setError('Failed to schedule this interaction.');
    }
  };

  const refreshPreValidation = async () => {
    if (!request || (request.status !== 'DRAFT' && request.status !== 'CORRECTION_REQUIRED')) return null;
    const validationRes = await api.post('/requests/' + request.id + '/pre-validate');
    setPreValidation(validationRes.data);
    return validationRes.data as PreValidationResult;
  };

  const handleDocumentUpload = async (requirementId: string, file: File | null) => {
    if (!request || !file) return;
    setUploadingRequirementId(requirementId);
    setError('');
    const formData = new FormData();
    formData.append('requirement_id', requirementId);
    formData.append('file', file);
    try {
      const res = await api.post('/requests/' + request.id + '/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((current) => [...current, res.data]);
      const reviewsRes = await api.get('/requests/' + request.id + '/document-reviews');
      setReviews(reviewsRes.data || []);
      await refreshPreValidation();
    } catch {
      setError('Document upload failed. Check the file type and size for this requirement.');
    } finally {
      setUploadingRequirementId(null);
    }
  };

  const handleSubmit = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      const validation = await refreshPreValidation();
      if (validation && !validation.is_valid) {
        setError('Required document checks must pass before submission.');
        return;
      }
      const res = await api.post('/requests/' + request.id + '/submit');
      setRequest(res.data);
    } catch {
      setError('Cannot submit. Ensure a centre is selected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!request) return;
    if (!window.confirm('Are you sure you want to cancel this request? This action cannot be undone.')) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/requests/' + request.id + '/cancel');
      setRequest(res.data);
    } catch {
      setError('Failed to cancel request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseRequest = async () => {
    if (!request) return;
    if (!window.confirm('Are you sure you want to close this request? This confirms that you have received the output and completes the lifecycle.')) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/requests/' + request.id + '/close');
      setRequest(res.data);
    } catch {
      setError('Failed to close request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">{error}</div>
    );
  }

  if (!request) return null;

  const statusColor = STATUS_COLORS[request.status] || 'bg-slate-100 text-slate-600';
  const currentDocumentByRequirement = new Map(
    documents.filter((doc) => doc.is_current).map((doc) => [doc.requirement_id, doc])
  );
  const latestReviewByRequirement = new Map(
    reviews.map((review) => [review.requirement_id, review])
  );
  const canUploadDocuments = request.status === 'DRAFT' || request.status === 'CORRECTION_REQUIRED';
  const canCancel = [
    'DRAFT', 'SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED',
    'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'INTERACTION_SCHEDULED'
  ].includes(request.status);

  return (
    <div>
      <button
        onClick={() => navigate('/requests')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Requests
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-br from-purple-50/50 to-white">
          <div className="flex items-center gap-3 mb-4 justify-between">
            <div className="flex items-center gap-3">
              <span className={('px-3 py-1 rounded-full text-sm font-medium ' + statusColor)}>
                {formatStatus(request.status)}
              </span>
              <span className="text-sm text-slate-400">Type {request.service_type_snapshot}</span>
            </div>
            {canCancel && (
              <button
                onClick={handleCancelRequest}
                disabled={isSubmitting}
                className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Cancel Request
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-indigo-950 mb-2">{request.service_name_snapshot}</h1>
          <div className="text-slate-500 text-sm">
            Created {new Date(request.created_at).toLocaleDateString()}
            {request.submitted_at && ' · Submitted ' + new Date(request.submitted_at).toLocaleDateString()}
          </div>
            {request.fee_snapshot && (
              <div className="mt-4 text-lg font-semibold text-slate-900">
                Fee: Rs {request.fee_snapshot}
              </div>
            )}
            
            {request.status === 'COMPLETED' && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCloseRequest}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Close Request
                </button>
              </div>
            )}
          </div>

        {error && (
          <div className="mx-8 mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
            {error}
          </div>
        )}

        {request.status === 'DRAFT' && (
          <div className="p-8">
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                Required Documents
              </h2>

              {requirements.length === 0 ? (
                <p className="text-slate-500 text-sm">No documents are required for this service.</p>
              ) : (
                <div className="grid gap-3">
                  {requirements.map((requirement) => {
                    const document = currentDocumentByRequirement.get(requirement.id);
                    return (
                      <div key={requirement.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {requirement.name}
                              {requirement.is_required && <span className="text-red-600"> *</span>}
                            </div>
                            {requirement.description && (
                              <div className="text-sm text-slate-500 mt-1">{requirement.description}</div>
                            )}
                            <div className="text-xs text-slate-500 mt-2">
                              {requirement.allowed_file_types.length > 0
                                ? 'Allowed: ' + requirement.allowed_file_types.map((type) => type.mime_type).join(', ')
                                : 'Allowed file type configured by centre'}
                              {requirement.max_file_size_bytes
                                ? ' · Max ' + Math.round(requirement.max_file_size_bytes / 1024) + ' KB'
                                : ''}
                            </div>
                            {document && (
                              <div className="text-sm text-green-700 mt-2">
                                Uploaded {document.original_filename} · v{document.version}
                              </div>
                            )}
                            {latestReviewByRequirement.get(requirement.id)?.reason && (
                              <div className="text-sm text-red-700 mt-2">
                                Correction: {latestReviewByRequirement.get(requirement.id)?.reason}
                              </div>
                            )}
                          </div>
                          {canUploadDocuments && (
                            <label className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 cursor-pointer transition-colors">
                              {uploadingRequirementId === requirement.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Upload size={16} />
                              )}
                              {document ? 'Replace' : 'Upload'}
                              <input
                                type="file"
                                className="sr-only"
                                disabled={uploadingRequirementId === requirement.id}
                                onChange={(event) => handleDocumentUpload(requirement.id, event.target.files?.[0] || null)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {preValidation && (
              <section className="mb-8 rounded-xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-indigo-950">Document Checks</h2>
                  <span className={'px-3 py-1 rounded-full text-sm font-medium ' + (preValidation.is_valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                    {preValidation.is_valid ? 'Ready' : 'Needs attention'}
                  </span>
                </div>
                <div className="grid gap-2">
                  {preValidation.items.map((item) => (
                    <div key={item.requirement_id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="font-medium text-slate-900">{item.requirement_name}</div>
                        <span className={'text-xs font-semibold ' + (item.status === 'FAIL' ? 'text-red-700' : item.status === 'WARNING' ? 'text-yellow-700' : 'text-green-700')}>
                          {item.status}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {item.messages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-purple-600" />
              Select a Centre
            </h2>

            {centres.length === 0 ? (
              <p className="text-slate-500 text-sm">No centres available for this service.</p>
            ) : (
              <div className="grid gap-3">
                {centres.map((centre) => (
                  <button
                    key={centre.id}
                    onClick={() => handleSelectCentre(centre.id)}
                    className={('w-full text-left p-4 rounded-xl border-2 transition-all ' + (request.selected_centre_id === centre.id ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200 bg-white'))}
                  >
                    <div className="font-semibold text-slate-900">{centre.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{centre.district}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!request.selected_centre_id || isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}

        {interactions.length > 0 && (
          <div className="p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
              <CalendarClock size={20} className="text-purple-600" />
              Centre Interactions
            </h2>
            <div className="grid gap-3">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-900">{interaction.reason}</div>
                  {interaction.instructions && (
                    <div className="text-sm text-slate-600 mt-1">{interaction.instructions}</div>
                  )}
                  <div className="text-sm text-slate-500 mt-2">
                    Status: {interaction.status}
                    {interaction.scheduled_at ? ' · ' + new Date(interaction.scheduled_at).toLocaleString() : ''}
                  </div>
                  {(interaction.status === 'REQUESTED' || interaction.status === 'MISSED') && request.status === 'INTERACTION_REQUIRED' && (
                    <div className="mt-3 flex flex-col gap-2 md:flex-row">
                      <input
                        type="datetime-local"
                        value={scheduleValues[interaction.id] || ''}
                        onChange={(event) => setScheduleValues((current) => ({ ...current, [interaction.id]: event.target.value }))}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => handleScheduleInteraction(interaction.id)}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                      >
                        Schedule
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {request.status !== 'DRAFT' && (
          <div className="p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-indigo-950 mb-4">Payments</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payment requested yet.</p>
            ) : (
              <div className="grid gap-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="font-semibold text-slate-900">
                      {payment.currency} {payment.amount} · {payment.status}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {payment.provider} · {payment.provider_reference}
                    </div>
                    {payment.status === 'PENDING' && request.status === 'PAYMENT_PENDING' && (
                      <button
                        onClick={() => handleConfirmPayment(payment.id)}
                        className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Confirm Mock Payment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {request.status !== 'DRAFT' && (
          <div className="p-8 border-t border-slate-100">
            <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-purple-600" />
              Messages
            </h2>
            <div className="space-y-3 mb-4">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-500">No messages yet.</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-sm text-slate-900">{message.body}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(message.created_at).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Write a request message"
              />
              <button
                onClick={handleSendMessage}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {request.status !== 'DRAFT' && (
          <div className="p-8 border-t border-slate-100">
            {output && (
              <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50">
                <h3 className="font-semibold text-green-900 mb-2">Request Completed</h3>
                <p className="text-green-800 text-sm">
                  {output.collection_instructions || "Your request has been processed successfully. Please collect your output from the centre."}
                </p>
              </div>
            )}
            <div className="text-slate-500 text-sm">
              Your request has been submitted and is being processed.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
