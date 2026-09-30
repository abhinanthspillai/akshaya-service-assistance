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
  pincode?: string;
  distance_km?: number;
}

interface RequestDocument {
  id: string;
  original_filename: string;
  status: string;
  employee_remarks: string | null;
  requirement_id: string;
  size_bytes: number;
}

type Step = 'requirements' | 'centre' | 'documents' | 'review';

export function NewRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [stagedFiles, setStagedFiles] = useState<Record<string, File>>({});
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentStep, setCurrentStep] = useState<Step>('requirements');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        <Loader2 className="animate-spin text-mono-text" size={32} />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-red-600/10 text-red-600 p-4 rounded-[16px] border border-red-600/20">
        {error || 'Service not found'}
      </div>
    );
  }

  const fetchCentres = async (draftId: string, lat?: number, lng?: number) => {
    let url = `/services/${service.id}/centres`;
    if (lat !== undefined && lng !== undefined) {
      url += `?lat=${lat}&lng=${lng}`;
    }
    const [centresRes, docsRes] = await Promise.all([
      api.get(url),
      api.get(`/requests/${draftId}/documents`)
    ]);
    setCentres(centresRes.data);
    setDocuments(docsRes.data);
  };

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
      
      const finalDraftId = draftId as string;
      setCurrentStep('centre');

      // Wrap geolocation in a Promise with a 3 second timeout
      const getLocation = () => new Promise<{lat: number, lng: number}>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { timeout: 3000 }
        );
        // Fallback timeout in case the browser doesn't respect the timeout option or permission dialog hangs
        setTimeout(() => reject(new Error('Geolocation timeout')), 3000);
      });

      try {
        const { lat, lng } = await getLocation();
        setUserLocation({ lat, lng });
        await fetchCentres(finalDraftId, lat, lng);
      } catch (err) {
        setLocationDenied(true);
        // Fallback to All Centres
        if (activeTab === 'nearest') setActiveTab('all');
        await fetchCentres(finalDraftId);
      }
    } catch (err) {
      const e = err as AxiosError<{detail: string}>;
      setError(e.response?.data?.detail || 'Failed to initialize request. Please try again.');
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
      if (service.document_requirements.length > 0) {
        setCurrentStep('documents');
      } else {
        setCurrentStep('review');
      }
    } catch (err) {
      const e = err as AxiosError<{detail: string}>;
      setError(e.response?.data?.detail || 'Failed to assign centre. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleUploadAll = async () => {
    if (isProcessing) return;
    
    const requirementsToUpload = Object.keys(stagedFiles);
    if (requirementsToUpload.length === 0) {
      setCurrentStep('review');
      return;
    }

    setIsProcessing(true);
    setError('');

    // Reset statuses to uploading
    const newStatuses: Record<string, 'uploading' | 'success' | 'error'> = {};
    const newErrors: Record<string, string> = {};
    for (const reqId of requirementsToUpload) {
      newStatuses[reqId] = 'uploading';
      newErrors[reqId] = '';
    }
    setUploadStatuses(prev => ({ ...prev, ...newStatuses }));
    setUploadErrors(prev => ({ ...prev, ...newErrors }));

    const uploadPromises = requirementsToUpload.map(async (reqId) => {
      const file = stagedFiles[reqId];
      const formData = new FormData();
      formData.append('requirement_id', reqId);
      formData.append('file', file);

      try {
        const res = await api.post(`/requests/${requestId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        // Update documents list with the new uploaded doc
        setDocuments(prev => {
          const filtered = prev.filter(d => d.requirement_id !== reqId);
          return [...filtered, res.data];
        });
        
        return { reqId, success: true };
      } catch (err: any) {
        return { 
          reqId, 
          success: false, 
          error: err.response?.data?.detail || 'Failed to upload document.' 
        };
      }
    });

    const results = await Promise.all(uploadPromises);
    
    let hasError = false;
    const finalStatuses: Record<string, 'uploading' | 'success' | 'error'> = {};
    const finalErrors: Record<string, string> = {};
    const newStagedFiles = { ...stagedFiles };

    for (const result of results) {
      if (result.success) {
        finalStatuses[result.reqId] = 'success';
        delete newStagedFiles[result.reqId];
      } else {
        hasError = true;
        finalStatuses[result.reqId] = 'error';
        finalErrors[result.reqId] = result.error!;
      }
    }

    setUploadStatuses(prev => ({ ...prev, ...finalStatuses }));
    setUploadErrors(prev => ({ ...prev, ...finalErrors }));
    setStagedFiles(newStagedFiles);

    setIsProcessing(false);

    if (hasError) {
      setError('Some documents failed to upload. Please review the errors below.');
    } else {
      setCurrentStep('review');
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
      const e = err as AxiosError<{detail: string}>;
      setError(e.response?.data?.detail || 'Failed to submit request. Please try again.');
      setIsProcessing(false);
    }
  };

  const requiredDocs = service.document_requirements;
  const conditionalDocs: typeof requiredDocs = [];

  const hasAllRequiredDocuments = service.document_requirements
    .every(req => 
      documents.some(doc => doc.requirement_id === req.id && doc.status !== 'REJECTED') ||
      !!stagedFiles[req.id]
    );

  const filteredCentres = centres.filter(c => 
    !searchQuery || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.pincode && c.pincode.includes(searchQuery))
  );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button 
        onClick={() => navigate(`/services/${service.id}`)}
        className="flex items-center gap-2 text-sm font-medium text-mono-muted hover:text-mono-text mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Cancel & Return to Service
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-mono-text mb-2">New Service Request</h1>
        <p className="text-mono-muted">{service.name}</p>
      </div>

      <div className="flex items-center justify-between mb-12 px-2 sm:px-8">
        {[
          { id: 'requirements', label: 'Requirements', visible: true, stepNumber: 1 },
          { id: 'centre', label: 'Centre', visible: true, stepNumber: 2 },
          { id: 'documents', label: 'Documents', visible: service.document_requirements.length > 0, stepNumber: 3 },
          { id: 'review', label: 'Review', visible: true, stepNumber: service.document_requirements.length > 0 ? 4 : 3 }
        ].filter(s => s.visible).map((step, index, arr) => {
          const stepIndex = arr.findIndex(s => s.id === step.id);
          const currentIndex = arr.findIndex(s => s.id === currentStep);
          const isPast = currentIndex > stepIndex;
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="relative flex flex-col items-center shrink-0">
                <div className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors z-10",
                  isPast || isCurrent ? "bg-mono-text text-white" : "bg-ink-200 text-mono-muted"
                )}>
                  {isPast ? <CheckCircle2 size={20} /> : step.stepNumber}
                </div>
                <span className={clsx("absolute top-12 text-xs font-semibold uppercase tracking-wider whitespace-nowrap", 
                  (isPast || isCurrent) ? "text-mono-text" : "text-mono-muted"
                )}>
                  {step.label}
                </span>
              </div>
              
              {index < arr.length - 1 && (
                <div className={clsx(
                  "flex-1 h-[2px] mx-2 sm:mx-4 transition-colors",
                  currentIndex > stepIndex ? "bg-mono-text" : "bg-ink-200"
                )}></div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-600/10 text-red-600 p-4 rounded-[16px] mb-6 border border-red-600/20 text-sm">
          {error}
        </div>
      )}

      <div className="bg-mono-surface rounded-[16px] border border-mono-border overflow-hidden">
        
        {currentStep === 'requirements' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-mono-muted/20">
              <div className="w-12 h-12 bg-blue-600/10 rounded-[16px] flex items-center justify-center text-mono-text">
                <FileCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-mono-text">Review Requirements</h2>
                <p className="text-sm text-mono-muted">Ensure you have all mandatory documents ready.</p>
              </div>
            </div>

            <div className="space-y-8">
              {requiredDocs.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-mono-muted mb-4 uppercase tracking-wider">Required Documents</h3>
                  <ul className="space-y-3">
                    {requiredDocs.map(req => (
                      <li key={req.id} className="flex items-start gap-3 bg-mono-surface p-4 rounded-xl border border-mono-border">
                        <CheckCircle2 size={18} className="text-mono-text mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-mono-text text-sm flex items-center gap-2">
                            {req.name}
                            
                          </p>
                          {req.description && (
                            <p className="text-xs text-mono-muted mt-1">{req.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}



              {requiredDocs.length === 0 && (
                <p className="text-mono-muted text-sm">No documents required for this service.</p>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreateDraft}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-mono-text hover:bg-mono-text disabled:opacity-70 text-white font-semibold px-6 py-2.5 rounded-[16px] transition-all "
              >
                {isProcessing && <Loader2 size={18} className="animate-spin" />}
                Acknowledge & Continue
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'centre' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-mono-muted/20">
              <div className="w-12 h-12 bg-blue-600/10 rounded-[16px] flex items-center justify-center text-mono-text">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-mono-text">Select Akshaya Centre</h2>
                <p className="text-sm text-mono-muted">Choose a centre that supports this service.</p>
              </div>
            </div>

            {locationDenied && (
              <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="Search by district, name, or pincode..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-mono-border rounded-[8px] bg-mono-bg text-mono-text text-sm"
                />
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {(activeTab === 'nearest' ? filteredCentres.slice(0, 5) : filteredCentres).map((centre, idx) => (
                <label 
                  key={centre.id} 
                  className={clsx(
                    "flex items-start gap-4 p-4 rounded-[16px] border-2 cursor-pointer transition-all",
                    selectedCentreId === centre.id 
                      ? "border-indigo-600 bg-blue-50 " 
                      : "border-mono-muted/20 hover:border-indigo-300 hover:bg-mono-bg",
                    idx === 0 && !locationDenied && "ring-2 ring-indigo-200"
                  )}
                >
                  <div className="pt-1">
                    <div className={clsx(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedCentreId === centre.id ? "border-indigo-600" : "border-ink-300"
                    )}>
                      {selectedCentreId === centre.id && <div className="w-2.5 h-2.5 rounded-full bg-mono-text" />}
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
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-mono-text">{centre.name}</h3>
                      {idx === 0 && !locationDenied && userLocation && (
                        <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ml-2">Nearest</span>
                      )}
                    </div>
                    <p className="text-sm text-mono-muted mt-0.5">{centre.district} • {centre.code}</p>
                    {centre.distance_km !== undefined && centre.distance_km !== null && (
                      <p className="text-xs font-semibold text-indigo-600 mt-1">
                        {centre.distance_km.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                </label>
              ))}
              {filteredCentres.length === 0 && (
                <div className="text-center text-mono-muted p-4 border border-dashed border-mono-border rounded-[16px]">
                  No centres found matching your search.
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep('requirements')}
                disabled={isProcessing}
                className="text-mono-muted font-medium px-4 py-2 hover:bg-mono-bg rounded-[16px] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSelectCentre}
                disabled={!selectedCentreId || isProcessing}
                className="flex items-center gap-2 bg-mono-text hover:bg-mono-text disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-[16px] transition-all "
              >
                {isProcessing && <Loader2 size={18} className="animate-spin" />}
                Confirm Centre
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'documents' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-mono-muted/20">
              <div className="w-12 h-12 bg-blue-600/10 rounded-[16px] flex items-center justify-center text-mono-text">
                <UploadCloud size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-mono-text">Upload Documents</h2>
                <p className="text-sm text-mono-muted">Provide the required documents for your application.</p>
              </div>
            </div>

            <div className="space-y-10">
              {requiredDocs.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-mono-muted mb-4 uppercase tracking-wider border-b border-mono-border pb-2">Required Documents</h3>
                  <div className="space-y-4">
                    {requiredDocs.map(req => {
                      const existingDoc = documents.find(d => d.requirement_id === req.id);
                      return (
                        <DocumentUpload
                          key={req.id}
                          requestId={requestId!}
                          requirement={req}
                          existingDocument={existingDoc}
                          stagedFile={stagedFiles[req.id]}
                          onFileStage={(file) => {
                            setStagedFiles(prev => {
                              const newFiles = { ...prev };
                              if (file) newFiles[req.id] = file;
                              else delete newFiles[req.id];
                              return newFiles;
                            });
                            // Reset status when file changes
                            setUploadStatuses(prev => ({ ...prev, [req.id]: 'pending' }));
                            setUploadErrors(prev => ({ ...prev, [req.id]: '' }));
                          }}
                          uploadStatus={uploadStatuses[req.id] || 'pending'}
                          uploadProgressError={uploadErrors[req.id] || ''}
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
                </div>
              )}


            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep('centre')}
                disabled={isProcessing}
                className="text-mono-muted font-medium px-4 py-2 hover:bg-mono-bg rounded-[16px] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep('review')}
                disabled={!hasAllRequiredDocuments || isProcessing}
                className="flex items-center gap-2 bg-mono-text hover:bg-mono-text disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-[16px] transition-all "
              >
                Continue
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-mono-muted/20">
              <div className="w-12 h-12 bg-blue-600/10 rounded-[16px] flex items-center justify-center text-mono-text">
                <Send size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-mono-text">Review & Submit</h2>
                <p className="text-sm text-mono-muted">Verify your request details before submitting.</p>
              </div>
            </div>

            <div className="bg-mono-bg p-6 rounded-[16px] border border-mono-muted/20 space-y-4 mb-8">
              <div>
                <div className="text-xs font-semibold text-mono-muted uppercase tracking-wider mb-1">Service</div>
                <div className="font-medium text-mono-text">{service.name}</div>
                <div className="text-sm text-mono-muted mt-1">{service.service_type === 'A' ? 'Remote Processing' : service.service_type === 'B' ? 'Hybrid Service' : 'Physical Visit Required'}</div>
              </div>
              
              <div>
                <div className="text-xs font-semibold text-mono-muted uppercase tracking-wider mb-1">Base Fee</div>
                <div className="font-medium text-mono-text">{service.base_fee ? `₹${service.base_fee}` : 'Free'}</div>
              </div>

              {selectedCentreId && (
                <div>
                  <div className="text-xs font-semibold text-mono-muted uppercase tracking-wider mb-1">Selected Centre</div>
                  <div className="font-medium text-mono-text">
                    {centres.find(c => c.id === selectedCentreId)?.name}
                  </div>
                </div>
              )}

              {documents.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-mono-muted uppercase tracking-wider mb-2 mt-4">Uploaded Documents</div>
                  <div className="space-y-3 bg-mono-surface p-4 rounded-xl border border-mono-border">
                    {documents.map(doc => {
                      const req = service.document_requirements.find(r => r.id === doc.requirement_id);
                      return (
                        <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-mono-text border-b last:border-0 border-mono-border pb-3 last:pb-0">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="font-semibold">{req?.name}</span>
                              <span className="text-mono-muted text-[13px]">{doc.original_filename}</span>
                              <span className="text-xs text-mono-muted mt-0.5">{(doc.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-6 sm:ml-0">
                            <a 
                              href={`${api.defaults.baseURL}/requests/${requestId}/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[13px] font-semibold text-mono-text hover:text-black transition-colors"
                            >
                              [ View ]
                            </a>
                            <button
                              onClick={() => setCurrentStep('documents')}
                              className="text-[13px] font-semibold text-mono-text hover:text-black transition-colors"
                            >
                              [ Replace ]
                            </button>
                          </div>
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
                  if (service.document_requirements.length > 0) setCurrentStep('documents');
                  else setCurrentStep('centre');
                }}
                disabled={isProcessing}
                className="text-mono-muted font-medium px-4 py-2 hover:bg-mono-bg rounded-[16px] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-mono-text hover:bg-mono-text disabled:opacity-70 text-white font-semibold px-8 py-3 rounded-[16px] transition-all transform hover:-translate-y-0.5"
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
