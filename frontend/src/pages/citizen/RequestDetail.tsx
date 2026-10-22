import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, MapPin, Upload, FileText, CalendarClock, MessageSquare, Trash2 } from 'lucide-react';
import { formatStatus } from '../../utils/format';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

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
 confirmed_at?: string | null;
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
 DRAFT: 'bg-mono-bg text-mono-text',
 SUBMITTED: 'bg-accent-50 text-blue-600',
 WAITING_FOR_CENTRE: 'bg-yellow-50 text-yellow-800',
 ACCEPTED: 'bg-blue-600/10 text-mono-text',
 UNDER_REVIEW: 'bg-purple-50 text-purple-700',
 COMPLETED: 'bg-green-50 text-green-800',
 CANCELLED: 'bg-red-600/10 text-red-600',
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
 const [confirmAction, setConfirmAction] = useState<{
 isOpen: boolean;
 action: 'cancel' | 'delete' | 'close';
 title: string;
 message: string;
 label: string;
 isDestructive: boolean;
 }>({
 isOpen: false,
 action: 'cancel',
 title: '',
 message: '',
 label: '',
 isDestructive: false,
 });
 const navigate = useNavigate();

 const isChatEnabled = !!request && !['DRAFT', 'SUBMITTED', 'WAITING_FOR_CENTRE'].includes(request.status);

 const fetchData = async () => {
   if (!id) return;
   setIsLoading(true);
   setError('');
   let currentReq: ServiceRequest | null = null;
   try {
     const res = await api.get('/requests/' + id);
     currentReq = res.data;
     setRequest(res.data);
   } catch {
     setError('Failed to load request details.');
     setIsLoading(false);
     return;
   }

   if (!currentReq) {
     setIsLoading(false);
     return;
   }

   try {
     const canChat = !['DRAFT', 'SUBMITTED', 'WAITING_FOR_CENTRE'].includes(currentReq.status);
     const [serviceRes, documentsRes, reviewsRes, interactionsRes, messagesRes, paymentsRes] = await Promise.allSettled([
       api.get('/services/' + currentReq.service_id),
       api.get('/requests/' + currentReq.id + '/documents'),
       api.get('/requests/' + currentReq.id + '/document-reviews'),
       api.get('/requests/' + currentReq.id + '/interactions'),
       canChat ? api.get('/requests/' + currentReq.id + '/messages') : Promise.resolve({ data: [] }),
       api.get('/requests/' + currentReq.id + '/payments'),
     ]);

     if (serviceRes.status === 'fulfilled') {
       setRequirements(serviceRes.value.data.document_requirements || []);
     }
     if (documentsRes.status === 'fulfilled') {
       setDocuments(documentsRes.value.data || []);
     }
     if (reviewsRes.status === 'fulfilled') {
       setReviews(reviewsRes.value.data || []);
     }
     if (interactionsRes.status === 'fulfilled') {
       setInteractions(interactionsRes.value.data || []);
     }
     if (messagesRes.status === 'fulfilled') {
       setMessages(messagesRes.value.data || []);
     } else {
       setMessages([]);
     }
     if (paymentsRes.status === 'fulfilled') {
       setPayments(paymentsRes.value.data || []);
     }

     if (currentReq.status === 'DRAFT' || currentReq.status === 'CORRECTION_REQUIRED') {
       try {
         const validationRes = await api.post('/requests/' + currentReq.id + '/pre-validate');
         setPreValidation(validationRes.data);
       } catch {
         // non-critical
       }
     }
     if (currentReq.status === 'COMPLETED' || currentReq.status === 'CLOSED') {
       try {
         const outRes = await api.get('/requests/' + currentReq.id + '/output');
         setOutput(outRes.data);
       } catch {
         // ignore
       }
     }
     if (currentReq.status === 'DRAFT' && currentReq.service_id) {
       try {
         const centresRes = await api.get('/centres/?active=true');
         setCentres(centresRes.data);
       } catch {
         // ignore
       }
     }
   } finally {
     setIsLoading(false);
   }
 };

 useEffect(() => {
   fetchData();
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
 if (!request || !newMessage.trim() || !isChatEnabled) return;
 try {
 const res = await api.post('/requests/' + request.id + '/messages', { body: newMessage.trim() });
 setMessages((current) => [...current, res.data]);
 setNewMessage('');
 } catch {
 setError('Failed to send message.');
 }
 };


  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  const handleRazorpayPayment = async (paymentId: string) => {
    if (!request) return;
    setIsProcessingPayment(true);
    setError('');
    try {
      const orderRes = await api.post<{
        order_id: string;
        amount: number;
        currency: string;
        key_id: string;
        payment_id: string;
        service_name: string;
      }>(`/requests/${request.id}/payments/${paymentId}/razorpay-order`);

      const orderData = orderRes.data;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzpWindow = window as any;
      if (typeof rzpWindow.Razorpay === 'function') {
        const options = {
          key: orderData.key_id || 'rzp_test_placeholder',
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SAHAYA (Akshaya Services)',
          description: `Fee for ${orderData.service_name}`,
          order_id: orderData.order_id,
          modal: {
            ondismiss: () => {
              setIsProcessingPayment(false);
            },
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await api.post(
                `/requests/${request.id}/payments/${paymentId}/razorpay-verify`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }
              );
              setPayments((current) =>
                current.map((p) => (p.id === paymentId ? verifyRes.data : p))
              );
              const reqRes = await api.get('/requests/' + request.id);
              setRequest(reqRes.data);
            } catch (err: unknown) {
              const anyErr = err as { response?: { data?: { detail?: string } } };
              setError(anyErr.response?.data?.detail || 'Payment verification failed.');
            } finally {
              setIsProcessingPayment(false);
            }
          },
          prefill: {
            name: 'Akshaya Citizen',
            email: 'citizen@example.com',
          },
          theme: {
            color: '#000000',
          },
        };

        const razorpayInstance = new rzpWindow.Razorpay(options);
        razorpayInstance.on('payment.failed', function (resp: { error?: { description?: string } }) {
          setError(resp.error?.description || 'Payment failed or cancelled.');
          setIsProcessingPayment(false);
        });
        razorpayInstance.open();
      } else {
        const verifyRes = await api.post(
          `/requests/${request.id}/payments/${paymentId}/razorpay-verify`,
          {
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: `pay_demo_${Date.now()}`,
            razorpay_signature: 'mock_signature_valid',
          }
        );
        setPayments((current) =>
          current.map((p) => (p.id === paymentId ? verifyRes.data : p))
        );
        const reqRes = await api.get('/requests/' + request.id);
        setRequest(reqRes.data);
        setIsProcessingPayment(false);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      setError(anyErr.response?.data?.detail || 'Failed to initiate payment.');
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    await handleRazorpayPayment(paymentId);
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
   setConfirmAction({
     isOpen: true,
     action: 'cancel',
     title: 'Cancel Request',
     message: 'Are you sure you want to cancel this request? This action cannot be undone.',
     label: 'Cancel Request',
     isDestructive: true
   });
 };

 const handleDeleteRequest = async () => {
   const actionType = request?.status === 'DRAFT' ? 'delete' : 'archive';
   setConfirmAction({
     isOpen: true,
     action: 'delete',
     title: request?.status === 'DRAFT' ? 'Delete Request' : 'Archive Request',
     message: `Are you sure you want to ${actionType} this request? This cannot be undone.`,
     label: request?.status === 'DRAFT' ? 'Delete' : 'Archive',
     isDestructive: true
   });
 };

 const handleCloseRequest = async () => {
   setConfirmAction({
     isOpen: true,
     action: 'close',
     title: 'Close Request',
     message: 'Are you sure you want to close this request? This confirms that you have received the output and completes the lifecycle.',
     label: 'Close Request',
     isDestructive: false
   });
 };

 const executeConfirmAction = async () => {
   if (!request) return;
   setIsSubmitting(true);
   setError('');
   try {
     if (confirmAction.action === 'cancel') {
       const res = await api.post('/requests/' + request.id + '/cancel');
       setRequest(res.data);
     } else if (confirmAction.action === 'delete') {
       await api.delete('/requests/' + request.id);
       navigate('/requests');
     } else if (confirmAction.action === 'close') {
       const res = await api.post('/requests/' + request.id + '/close');
       setRequest(res.data);
     }
     setConfirmAction(prev => ({ ...prev, isOpen: false }));
   } catch (err: unknown) {
     const actionText = confirmAction.action === 'delete' ? (request.status === 'DRAFT' ? 'delete' : 'archive') : confirmAction.action;
     setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || `Failed to ${actionText} request.`);
     setConfirmAction(prev => ({ ...prev, isOpen: false }));
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
 <div className="bg-red-600/10 text-red-600 p-6 rounded-[16px] border border-red-600/20 max-w-lg mx-auto my-12 text-center">
   <p className="font-semibold mb-4">{error}</p>
   <button
     onClick={() => fetchData()}
     className="bg-mono-text text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
   >
     Retry
   </button>
 </div>
 );
 }

 if (!request) return null;

 const statusColor = STATUS_COLORS[request.status] || 'bg-mono-bg text-mono-muted';
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
 <>
 <div>
 <button
 onClick={() => navigate('/requests')}
 className="flex items-center gap-2 text-sm text-mono-muted hover:text-mono-text mb-6 transition-colors"
 >
 <ArrowLeft size={16} />
 Back to Requests
 </button>

 <div className="bg-mono-surface rounded-[16px] border border-mono-border overflow-hidden mb-6">
 <div className="p-8 border-b border-mono-muted/20 bg-white /50 to-white">
 <div className="flex items-center gap-3 mb-4 justify-between">
 <div className="flex items-center gap-3">
 <span className={('px-3 py-1 rounded-full text-sm font-medium ' + statusColor)}>
 {formatStatus(request.status)}
 </span>
 <span className="text-sm text-mono-muted">Type {request.service_type_snapshot}</span>
 </div>
 <div className="flex items-center gap-2">
 {!['DRAFT', 'SUBMITTED', 'WAITING_FOR_CENTRE'].includes(request.status) && (
 <button
 onClick={() => {
 window.dispatchEvent(
 new CustomEvent('openChatThread', { detail: { requestId: request.id } })
 );
 }}
 className="text-sm flex items-center gap-1.5 text-mono-text bg-white border border-mono-border hover:bg-mono-surface font-medium px-3.5 py-1.5 rounded-[16px] transition-colors shadow-xs"
 >
 <MessageSquare size={16} />
 Message
 </button>
 )}
 {canCancel && (
 <button
 onClick={handleCancelRequest}
 disabled={isSubmitting}
 className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-[16px] hover:bg-red-600/10 transition-colors disabled:opacity-50"
 >
 Cancel Request
 </button>
 )}
 {(request.status === 'DRAFT' || request.status === 'COMPLETED' || request.status === 'CANCELLED') && (
 <button
 onClick={handleDeleteRequest}
 disabled={isSubmitting}
 className="text-sm flex items-center gap-1 text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded-[16px] hover:bg-red-600/10 transition-colors disabled:opacity-50"
 >
 <Trash2 size={16} /> {request.status === 'DRAFT' ? 'Delete' : 'Archive'}
 </button>
 )}
 </div>
 </div>
 <h1 className="text-2xl font-bold text-indigo-950 mb-2">{request.service_name_snapshot}</h1>
 <div className="text-mono-muted text-sm">
 Created {new Date(request.created_at).toLocaleDateString()}
 {request.submitted_at && ' · Submitted ' + new Date(request.submitted_at).toLocaleDateString()}
 </div>
 {request.fee_snapshot && (
 <div className="mt-4 text-lg font-semibold text-mono-text">
 Fee: Rs {request.fee_snapshot}
 </div>
 )}
 
 {request.status === 'COMPLETED' && (
 <div className="mt-6 flex gap-3">
 <button
 onClick={handleCloseRequest}
 disabled={isSubmitting}
 className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-[16px] transition-colors disabled:opacity-50"
 >
 Close Request
 </button>
 </div>
 )}
 </div>

 {error && (
 <div className="mx-8 mt-4 p-4 bg-red-600/10 text-red-600 rounded-[16px] border border-red-600/20 text-sm">
 {error}
 </div>
 )}

 {canUploadDocuments && (
 <div className="p-8">
 <section className="mb-8">
 <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
 <FileText size={20} className="text-purple-600" />
 Required Documents
 </h2>

 {requirements.length === 0 ? (
 <p className="text-mono-muted text-sm">No documents are required for this service.</p>
 ) : (
 <div className="grid gap-3">
 {requirements.map((requirement) => {
 const document = currentDocumentByRequirement.get(requirement.id);
 return (
 <div key={requirement.id} className="rounded-[16px] border border-mono-muted/20 bg-mono-bg/60 p-4">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="font-semibold text-mono-text">
 {requirement.name}
 {requirement.is_required && <span className="text-red-600"> *</span>}
 </div>
 {requirement.description && (
 <div className="text-sm text-mono-muted mt-1">{requirement.description}</div>
 )}
 <div className="text-xs text-mono-muted mt-2">
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
 <div className="text-sm text-red-600 mt-2">
 Correction: {latestReviewByRequirement.get(requirement.id)?.reason}
 </div>
 )}
 </div>
 {canUploadDocuments && (
 <label className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-white border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 cursor-pointer transition-colors">
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
 <section className="mb-8 rounded-[16px] border border-mono-muted/20 bg-white p-4">
 <div className="flex items-center justify-between gap-3 mb-3">
 <h2 className="text-lg font-semibold text-indigo-950">Document Checks</h2>
 <span className={'px-3 py-1 rounded-full text-sm font-medium ' + (preValidation.is_valid ? 'bg-green-50 text-green-700' : 'bg-red-600/10 text-red-600')}>
 {preValidation.is_valid ? 'Ready' : 'Needs attention'}
 </span>
 </div>
 <div className="grid gap-2">
 {preValidation.items.map((item) => (
 <div key={item.requirement_id} className="rounded-[16px] bg-mono-bg p-3">
 <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
 <div className="font-medium text-mono-text">{item.requirement_name}</div>
 <span className={'text-xs font-semibold ' + (item.status === 'FAIL' ? 'text-red-600' : item.status === 'WARNING' ? 'text-yellow-700' : 'text-green-700')}>
 {item.status}
 </span>
 </div>
 <ul className="mt-2 space-y-1 text-sm text-mono-muted">
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
 <p className="text-mono-muted text-sm">No centres available for this service.</p>
 ) : (
 <div className="grid gap-3">
 {centres.map((centre) => (
 <button
 key={centre.id}
 onClick={() => handleSelectCentre(centre.id)}
 className={('w-full text-left p-4 rounded-[16px] border-2 transition-all ' + (request.selected_centre_id === centre.id ? 'border-purple-500 bg-purple-50' : 'border-mono-muted/20 hover:border-purple-200 bg-white'))}
 >
 <div className="font-semibold text-mono-text">{centre.name}</div>
 <div className="text-sm text-mono-muted mt-0.5">{centre.district}</div>
 </button>
 ))}
 </div>
 )}

 <div className="mt-6 flex justify-end">
 <button
 onClick={handleSubmit}
 disabled={!request.selected_centre_id || isSubmitting}
 className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2.5 rounded-[16px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? 'Submitting...' : 'Submit Request'}
 </button>
 </div>
 </div>
 )}

 {interactions.length > 0 && (
 <div className="p-8 border-t border-mono-muted/20">
 <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
 <CalendarClock size={20} className="text-purple-600" />
 Centre Interactions
 </h2>
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
 {(interaction.status === 'REQUESTED' || interaction.status === 'MISSED') && request.status === 'INTERACTION_REQUIRED' && (
 <div className="mt-3 flex flex-col gap-2 md:flex-row">
 <input
 type="datetime-local"
 value={scheduleValues[interaction.id] || ''}
 onChange={(event) => setScheduleValues((current) => ({ ...current, [interaction.id]: event.target.value }))}
 className="rounded-[16px] border border-mono-muted/20 px-3 py-2 text-sm"
 />
 <button
 onClick={() => handleScheduleInteraction(interaction.id)}
 className="rounded-[16px] bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
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
 <div className="p-8 border-t border-mono-muted/20">
 <h2 className="text-lg font-semibold text-indigo-950 mb-4">Payments</h2>
 {payments.length === 0 ? (
 <p className="text-sm text-mono-muted">No payment requested yet.</p>
 ) : (
 <div className="grid gap-3">
 {payments.map((payment) => (
 <div key={payment.id} className="rounded-[16px] border border-mono-border bg-mono-bg p-5 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="font-bold text-mono-text text-base">
 {payment.currency} {payment.amount}
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-mono-surface border border-mono-border text-mono-muted font-medium">
 Test Mode
 </span>
 <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
 payment.status === 'CONFIRMED'
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
 : payment.status === 'FAILED'
 ? 'bg-rose-50 text-rose-700 border border-rose-200'
 : 'bg-purple-50 text-purple-700 border border-purple-200'
 }`}>
 {payment.status}
 </span>
 </div>
 </div>
 <div className="text-xs text-mono-muted mt-2">
 Reference: <span className="font-mono text-mono-text">{payment.provider_reference}</span> ({payment.provider})
 </div>
 {payment.confirmed_at && (
 <div className="text-xs text-emerald-700 mt-1 font-medium">
 Paid on: {new Date(payment.confirmed_at).toLocaleString()}
 </div>
 )}
 {payment.status === 'PENDING' && request.status === 'PAYMENT_PENDING' && (
 <button
 onClick={() => handleConfirmPayment(payment.id)}
 disabled={isProcessingPayment}
 className="mt-4 rounded-xl bg-mono-text text-mono-bg px-5 py-2.5 text-xs font-bold hover:bg-black transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
 >
 {isProcessingPayment ? 'Initiating Checkout...' : 'Pay Now (Razorpay Test Mode)'}
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {request.status !== 'DRAFT' && (
 <div className="p-8 border-t border-mono-muted/20">
 <h2 className="text-lg font-semibold text-indigo-950 mb-4 flex items-center gap-2">
 <MessageSquare size={20} className="text-purple-600" />
 Messages
 </h2>
 {!isChatEnabled ? (
   <div className="rounded-[16px] border border-mono-border bg-mono-surface p-6 text-center">
     <p className="text-sm text-mono-muted font-medium">
       Chat will be available once a staff member accepts your request.
     </p>
   </div>
 ) : (
   <>
     <div className="space-y-3 mb-4">
     {messages.length === 0 ? (
     <p className="text-sm text-mono-muted">No messages yet.</p>
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
     className="rounded-[16px] bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
     >
     Send
     </button>
     </div>
   </>
 )}
 </div>
 )}


 {request.status !== 'DRAFT' && (
 <div className="p-8 border-t border-mono-muted/20">
 {output && (
 <div className="mb-6 p-4 rounded-[16px] border border-green-200 bg-green-50">
 <h3 className="font-semibold text-green-900 mb-2">Request Completed</h3>
 <p className="text-green-800 text-sm">
 {output.collection_instructions || "Your request has been processed successfully. Please collect your output from the centre."}
 </p>
 </div>
 )}
 <div className="text-mono-muted text-sm">
 Your request has been submitted and is being processed.
 </div>
 </div>
 )}
 </div>
 </div>
 
 <ConfirmDialog
   isOpen={confirmAction.isOpen}
   title={confirmAction.title}
   message={confirmAction.message}
   confirmLabel={confirmAction.label}
   onConfirm={executeConfirmAction}
   onCancel={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
   isDestructive={confirmAction.isDestructive}
   isLoading={isSubmitting}
 />
 </>
 );
}
