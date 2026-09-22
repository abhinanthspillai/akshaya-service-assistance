import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, CheckCircle2, ChevronRight, FileCheck, Building2, Send, UploadCloud } from 'lucide-react';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { DocumentUpload } from '../../components/documents/DocumentUpload';

interface ServiceDetail {
 id: string;
 name: string;
 code: string;
 description: string;
 service_type: string;
 base_fee: number;
 document_requirements: Array<{
   id: string;
   name: string;
   description: string | null;
   requirement_type: string;
   conditional_rule: string | null;
   max_file_size_bytes: number | null;
   allowed_file_types: Array<{ mime_type: string }>;
 }>;
 interaction_requirements: Array<{
   id: string;
   name: string;
   is_mandatory: boolean;
 }>;
}

interface Centre {
 id: string;
 name: string;
 code: string;
 district: string;
}

interface RequestDocument {
  id: string;
  original_filename: string;
  status: string;
  employee_remarks: string | null;
  requirement_id: string;
}

type Step = 'requirements' | 'documents' | 'centre' | 'review';

export function NewRequest() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();

 const [service, setService] = useState<ServiceDetail | null>(null);
 const [centres, setCentres] = useState<Centre[]>([]);
 const [documents, setDocuments] = useState<RequestDocument[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState('');

 const [currentStep, setCurrentStep] = useState<Step>('requirements');
 const [requestId, setRequestId] = useState<string | null>(null);
 const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
 
 const [isProcessing, setIsProcessing] = useState(false);

 useEffect(() => {
   const fetchInitialData = async () => {
     try {
       const serviceRes = await api.get(`/services/${id}`);
       setService(serviceRes.data);
     } catch {
       setError('Failed to load service details.');
     } finally {
       setIsLoading(false);
     }
   };
   if (id) fetchInitialData();
 }, [id]);

 if (isLoading) {
   return (
     <div className="flex justify-center items-center h-64">
       <Loader2 className="animate-spin text-apple-text" size={32} />
     </div>
   );
 }

 if (error || !service) {
   return (
     <div className="bg-apple-red/10 text-apple-red p-4 rounded-[16px] border border-apple-red/20">
       {error || 'Service not found'}
     </div>
   );
 }

 const handleCreateDraft = async () => {
   if (isProcessing) return;
   setIsProcessing(true);
   setError('');
   
   try {
     let draftId = requestId;
     
     if (!draftId) {
       const reqRes = await api.post('/requests/', { service_id: service.id });
       draftId = reqRes.data.id;
       setRequestId(draftId);
     }
     
     const [centresRes, docsRes] = await Promise.all([
       api.get(`/services/${service.id}/centres`),
       api.get(`/requests/${draftId}/documents`)
     ]);
     
     const availableCentres = centresRes.data;
     setCentres(availableCentres);
     setDocuments(docsRes.data);

     if (service.document_requirements.length > 0) {
       setCurrentStep('documents');
     } else if (availableCentres.length > 0) {
       setCurrentStep('centre');
     } else {
       setCurrentStep('review');
     }
   } catch (err) {
     const error = err as AxiosError<{detail: string}>;
     setError(error.response?.data?.detail || 'Failed to initialize request. Please try again.');
   } finally {
     setIsProcessing(false);
   }
 };

 const handleSelectCentre = async () => {
   if (!requestId || !selectedCentreId || isProcessing) return;
   setIsProcessing(true);
   setError('');

   try {
     await api.post(`/requests/${requestId}/select-centre`, { centre_id: selectedCentreId });
     setCurrentStep('review');
   } catch (err) {
     const error = err as AxiosError<{detail: string}>;
     setError(error.response?.data?.detail || 'Failed to assign centre. Please try again.');
   } finally {
     setIsProcessing(false);
   }
 };

 const handleSubmit = async () => {
   if (!requestId || isProcessing) return;
   setIsProcessing(true);
   setError('');

   try {
     await api.post(`/requests/${requestId}/submit`);
     navigate(`/requests/${requestId}`);
   } catch (err) {
     const error = err as AxiosError<{detail: string}>;
     setError(error.response?.data?.detail || 'Failed to submit request. Please try again.');
     setIsProcessing(false);
   }
 };

 const hasAllRequiredDocuments = service.document_requirements
   .filter(req => req.requirement_type === 'REQUIRED')
   .every(req => documents.some(doc => doc.requirement_id === req.id && doc.status !== 'REJECTED'));

 return (
   <div className="max-w-4xl mx-auto pb-12">
     <button 
       onClick={() => navigate(`/services/${service.id}`)}
       className="flex items-center gap-2 text-sm font-medium text-apple-muted hover:text-apple-text mb-8 transition-colors"
     >
       <ArrowLeft size={16} />
       Cancel & Return to Service
     </button>

     <div className="mb-8">
       <h1 className="text-2xl font-bold text-apple-text mb-2">New Service Request</h1>
       <p className="text-apple-muted">{service.name}</p>
     </div>

     {/* Stepper */}
     <div className="flex items-center justify-between mb-8 relative">
       <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-ink-200 -z-10 -translate-y-1/2"></div>
       
       {/* Step 1 */}
       <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
         <div className={clsx(
           "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
           currentStep === 'requirements' ? "bg-apple-text text-white -indigo-200" : "bg-apple-text text-white"
         )}>
           {currentStep !== 'requirements' ? <CheckCircle2 size={20} /> : 1}
         </div>
         <span className={clsx("text-xs font-semibold uppercase tracking-wider", currentStep === 'requirements' ? "text-apple-text" : "text-apple-text")}>
           Requirements
         </span>
       </div>

       {/* Step 2 (Documents) */}
       {service.document_requirements.length > 0 && (
         <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
           <div className={clsx(
             "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
             currentStep === 'documents' ? "bg-apple-text text-white -indigo-200" : 
             (currentStep === 'centre' || currentStep === 'review') ? "bg-apple-text text-white" : "bg-ink-200 text-apple-muted"
           )}>
             {(currentStep === 'centre' || currentStep === 'review') ? <CheckCircle2 size={20} /> : 2}
           </div>
           <span className={clsx("text-xs font-semibold uppercase tracking-wider", 
             currentStep === 'documents' ? "text-apple-text" : 
             (currentStep === 'centre' || currentStep === 'review') ? "text-apple-text" : "text-apple-muted"
           )}>
             Documents
           </span>
         </div>
       )}

       {/* Step 3 (Centre) */}
       {centres.length > 0 && (
         <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
           <div className={clsx(
             "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
             currentStep === 'centre' ? "bg-apple-text text-white -indigo-200" : 
             currentStep === 'review' ? "bg-apple-text text-white" : "bg-ink-200 text-apple-muted"
           )}>
             {currentStep === 'review' ? <CheckCircle2 size={20} /> : (service.document_requirements.length > 0 ? 3 : 2)}
           </div>
           <span className={clsx("text-xs font-semibold uppercase tracking-wider", currentStep === 'centre' ? "text-apple-text" : currentStep === 'review' ? "text-apple-text" : "text-apple-muted")}>
             Centre
           </span>
         </div>
       )}

       {/* Step 4 (Review) */}
       <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
         <div className={clsx(
           "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
           currentStep === 'review' ? "bg-apple-text text-white -indigo-200" : "bg-ink-200 text-apple-muted"
         )}>
           {(service.document_requirements.length > 0 && centres.length > 0) ? 4 : 
            (service.document_requirements.length > 0 || centres.length > 0) ? 3 : 2}
         </div>
         <span className={clsx("text-xs font-semibold uppercase tracking-wider", currentStep === 'review' ? "text-apple-text" : "text-apple-muted")}>
           Review
         </span>
       </div>
     </div>

     {error && (
       <div className="bg-apple-red/10 text-apple-red p-4 rounded-[16px] mb-6 border border-apple-red/20 text-sm">
         {error}
       </div>
     )}

     {/* Wizard Content */}
     <div className="apple-card overflow-hidden">
       
       {currentStep === 'requirements' && (
         <div className="p-8">
           <div className="flex items-center gap-3 mb-6 pb-6 border-b border-apple-muted/20">
             <div className="w-12 h-12 bg-apple-blue/10 rounded-[16px] flex items-center justify-center text-apple-text">
               <FileCheck size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-apple-text">Review Requirements</h2>
               <p className="text-sm text-apple-muted">Ensure you have all mandatory documents ready.</p>
             </div>
           </div>

           <div className="space-y-6">
             <div>
               <h3 className="text-sm font-semibold text-apple-text mb-3 uppercase tracking-wider">Required Documents</h3>
               {service.document_requirements.length === 0 ? (
                 <p className="text-apple-muted text-sm">No documents required for this service.</p>
               ) : (
                 <ul className="space-y-3">
                   {service.document_requirements.map(req => (
                     <li key={req.id} className="flex items-start gap-3 bg-apple-bg p-4 rounded-[16px] border border-apple-muted/20">
                       <CheckCircle2 size={18} className={req.requirement_type === 'REQUIRED' ? "text-apple-text mt-0.5 shrink-0" : "text-apple-muted mt-0.5 shrink-0"} />
                       <div>
                         <p className="font-medium text-apple-text text-sm">{req.name}</p>
                         <p className="text-xs text-apple-muted mt-1">
                           {req.requirement_type === 'REQUIRED' ? 'Mandatory for application' : 
                            req.requirement_type === 'CONDITIONAL' ? 'Conditional (See instructions)' : 'Optional'}
                         </p>
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
             </div>
           </div>

           <div className="mt-8 flex justify-end">
             <button
               onClick={handleCreateDraft}
               disabled={isProcessing}
               className="flex items-center gap-2 bg-apple-text hover:bg-apple-text disabled:opacity-70 text-white font-semibold px-6 py-2.5 rounded-[16px] transition-all "
             >
               {isProcessing && <Loader2 size={18} className="animate-spin" />}
               Acknowledge & Continue
               <ChevronRight size={18} />
             </button>
           </div>
         </div>
       )}

       {currentStep === 'documents' && (
         <div className="p-8">
           <div className="flex items-center gap-3 mb-6 pb-6 border-b border-apple-muted/20">
             <div className="w-12 h-12 bg-apple-blue/10 rounded-[16px] flex items-center justify-center text-apple-text">
               <UploadCloud size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-apple-text">Upload Documents</h2>
               <p className="text-sm text-apple-muted">Provide the required documents for your application.</p>
             </div>
           </div>

           <div className="space-y-6">
             {service.document_requirements.map(req => {
               const existingDoc = documents.find(d => d.requirement_id === req.id);
               return (
                 <DocumentUpload
                   key={req.id}
                   requestId={requestId!}
                   requirement={req}
                   existingDocument={existingDoc}
                   onUploadSuccess={(newDoc) => {
                     setDocuments(prev => {
                       const filtered = prev.filter(d => d.requirement_id !== newDoc.requirement_id);
                       return [...filtered, newDoc];
                     });
                   }}
                 />
               );
             })}
           </div>

           <div className="mt-8 flex justify-between">
             <button
               onClick={() => setCurrentStep('requirements')}
               disabled={isProcessing}
               className="text-apple-muted font-medium px-4 py-2 hover:bg-apple-bg rounded-[16px] transition-colors"
             >
               Back
             </button>
             <button
               onClick={() => {
                 if (centres.length > 0) setCurrentStep('centre');
                 else setCurrentStep('review');
               }}
               disabled={!hasAllRequiredDocuments || isProcessing}
               className="flex items-center gap-2 bg-apple-text hover:bg-apple-text disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-[16px] transition-all "
             >
               Continue
               <ChevronRight size={18} />
             </button>
           </div>
         </div>
       )}

       {currentStep === 'centre' && (
         <div className="p-8">
           <div className="flex items-center gap-3 mb-6 pb-6 border-b border-apple-muted/20">
             <div className="w-12 h-12 bg-apple-blue/10 rounded-[16px] flex items-center justify-center text-apple-text">
               <Building2 size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-apple-text">Select Akshaya Centre</h2>
               <p className="text-sm text-apple-muted">Choose a centre that supports this service.</p>
             </div>
           </div>

           <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
             {centres.map(centre => (
               <label 
                 key={centre.id} 
                 className={clsx(
                   "flex items-start gap-4 p-4 rounded-[16px] border-2 cursor-pointer transition-all",
                   selectedCentreId === centre.id 
                     ? "border-indigo-600 bg-apple-blue/10/50 " 
                     : "border-apple-muted/20 hover:border-indigo-300 hover:bg-apple-bg"
                 )}
               >
                 <div className="pt-1">
                   <div className={clsx(
                     "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                     selectedCentreId === centre.id ? "border-indigo-600" : "border-ink-300"
                   )}>
                     {selectedCentreId === centre.id && <div className="w-2.5 h-2.5 rounded-full bg-apple-text" />}
                   </div>
                 </div>
                 <input 
                   type="radio" 
                   name="centre" 
                   value={centre.id} 
                   checked={selectedCentreId === centre.id}
                   onChange={() => setSelectedCentreId(centre.id)}
                   className="sr-only"
                 />
                 <div>
                   <h3 className="font-semibold text-apple-text">{centre.name}</h3>
                   <p className="text-sm text-apple-muted mt-0.5">{centre.district} • {centre.code}</p>
                 </div>
               </label>
             ))}
           </div>

           <div className="mt-8 flex justify-between">
             <button
               onClick={() => {
                 if (service.document_requirements.length > 0) setCurrentStep('documents');
                 else setCurrentStep('requirements');
               }}
               disabled={isProcessing}
               className="text-apple-muted font-medium px-4 py-2 hover:bg-apple-bg rounded-[16px] transition-colors"
             >
               Back
             </button>
             <button
               onClick={handleSelectCentre}
               disabled={!selectedCentreId || isProcessing}
               className="flex items-center gap-2 bg-apple-text hover:bg-apple-text disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-[16px] transition-all "
             >
               {isProcessing && <Loader2 size={18} className="animate-spin" />}
               Confirm Centre
               <ChevronRight size={18} />
             </button>
           </div>
         </div>
       )}

       {currentStep === 'review' && (
         <div className="p-8">
           <div className="flex items-center gap-3 mb-6 pb-6 border-b border-apple-muted/20">
             <div className="w-12 h-12 bg-apple-blue/10 rounded-[16px] flex items-center justify-center text-apple-text">
               <Send size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-apple-text">Review & Submit</h2>
               <p className="text-sm text-apple-muted">Verify your request details before submitting.</p>
             </div>
           </div>

           <div className="bg-apple-bg p-6 rounded-[16px] border border-apple-muted/20 space-y-4 mb-8">
             <div>
               <div className="text-xs font-semibold text-apple-muted uppercase tracking-wider mb-1">Service</div>
               <div className="font-medium text-apple-text">{service.name}</div>
               <div className="text-sm text-apple-muted mt-1">{service.service_type === 'A' ? 'Remote Processing' : service.service_type === 'B' ? 'Hybrid Service' : 'Physical Visit Required'}</div>
             </div>
             
             <div>
               <div className="text-xs font-semibold text-apple-muted uppercase tracking-wider mb-1">Base Fee</div>
               <div className="font-medium text-apple-text">{service.base_fee ? `₹${service.base_fee}` : 'Free'}</div>
             </div>

             {selectedCentreId && (
               <div>
                 <div className="text-xs font-semibold text-apple-muted uppercase tracking-wider mb-1">Selected Centre</div>
                 <div className="font-medium text-apple-text">
                   {centres.find(c => c.id === selectedCentreId)?.name}
                 </div>
               </div>
             )}

             {documents.length > 0 && (
               <div>
                 <div className="text-xs font-semibold text-apple-muted uppercase tracking-wider mb-2 mt-4">Uploaded Documents</div>
                 <div className="space-y-2">
                   {documents.map(doc => {
                     const req = service.document_requirements.find(r => r.id === doc.requirement_id);
                     return (
                       <div key={doc.id} className="flex items-center gap-2 text-sm text-apple-text">
                         <CheckCircle2 size={16} className="text-green-600" />
                         <span className="font-medium">{req?.name}:</span> {doc.original_filename}
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
           </div>

           <div className="bg-accent-50 text-blue-800 p-4 rounded-[16px] text-sm mb-8">
             By submitting this request, you agree to provide all mandatory documents to the Akshaya Centre for processing.
           </div>

           <div className="flex justify-between items-center">
             <button
               onClick={() => {
                 if (centres.length > 0) setCurrentStep('centre');
                 else if (service.document_requirements.length > 0) setCurrentStep('documents');
                 else setCurrentStep('requirements');
               }}
               disabled={isProcessing}
               className="text-apple-muted font-medium px-4 py-2 hover:bg-apple-bg rounded-[16px] transition-colors"
             >
               Back
             </button>
             <button
               onClick={handleSubmit}
               disabled={isProcessing}
               className="flex items-center gap-2 bg-apple-text hover:bg-apple-text disabled:opacity-70 text-white font-semibold px-8 py-3 rounded-[16px] transition-all -indigo-200 transform hover:-translate-y-0.5"
             >
               {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
               Submit Request
             </button>
           </div>
         </div>
       )}
     </div>
   </div>
 );
}
