import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Loader2, ArrowLeft, CheckCircle2, ChevronRight, FileCheck, Building2, Send } from 'lucide-react';
import { AxiosError } from 'axios';
import clsx from 'clsx';

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
    is_required: boolean;
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

type Step = 'requirements' | 'centre' | 'review';

export function NewRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [centres, setCentres] = useState<Centre[]>([]);
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
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
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
      
      // If we don't have a draft request yet, create one
      if (!draftId) {
        const reqRes = await api.post('/requests/', { service_id: service.id });
        draftId = reqRes.data.id;
        setRequestId(draftId);
      }
      
      // Fetch available centres for this service
      const centresRes = await api.get(`/services/${service.id}/centres`);
      const availableCentres = centresRes.data;
      setCentres(availableCentres);

      if (availableCentres.length > 0) {
        setCurrentStep('centre');
      } else {
        // If no centres required/supported, go directly to review
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
      setIsProcessing(false); // Only set false on error, on success we navigate away
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(`/services/${service.id}`)}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Cancel & Return to Service
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">New Service Request</h1>
        <p className="text-slate-500">{service.name}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
        
        {/* Step 1 */}
        <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
            currentStep === 'requirements' ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-indigo-600 text-white"
          )}>
            {currentStep !== 'requirements' ? <CheckCircle2 size={20} /> : 1}
          </div>
          <span className={clsx("text-xs font-semibold uppercase tracking-wider", currentStep === 'requirements' ? "text-indigo-900" : "text-indigo-600")}>
            Requirements
          </span>
        </div>

        {/* Step 2 */}
        {centres.length > 0 || currentStep === 'requirements' ? (
          <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
              currentStep === 'centre' ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : 
              currentStep === 'review' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {currentStep === 'review' ? <CheckCircle2 size={20} /> : 2}
            </div>
            <span className={clsx("text-xs font-semibold uppercase tracking-wider", currentStep === 'centre' ? "text-indigo-900" : currentStep === 'review' ? "text-indigo-600" : "text-slate-500")}>
              Centre
            </span>
          </div>
        ) : null}

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-2 bg-[#faf5ff] px-2">
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
            currentStep === 'review' ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-200 text-slate-500"
          )}>
            {centres.length > 0 || currentStep === 'requirements' ? 3 : 2}
          </div>
          <span className={clsx("text-xs font-semibold uppercase tracking-wider", currentStep === 'review' ? "text-indigo-900" : "text-slate-500")}>
            Review
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Wizard Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {currentStep === 'requirements' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <FileCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review Requirements</h2>
                <p className="text-sm text-slate-500">Ensure you have all mandatory documents ready.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Required Documents</h3>
                {service.document_requirements.length === 0 ? (
                  <p className="text-slate-500 text-sm">No documents required for this service.</p>
                ) : (
                  <ul className="space-y-3">
                    {service.document_requirements.map(req => (
                      <li key={req.id} className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <CheckCircle2 size={18} className={req.is_required ? "text-indigo-600 mt-0.5 shrink-0" : "text-slate-400 mt-0.5 shrink-0"} />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{req.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{req.is_required ? "Mandatory for application" : "Optional"}</p>
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
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm"
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
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select Akshaya Centre</h2>
                <p className="text-sm text-slate-500">Choose a centre that supports this service.</p>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {centres.map(centre => (
                <label 
                  key={centre.id} 
                  className={clsx(
                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    selectedCentreId === centre.id 
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm" 
                      : "border-slate-100 hover:border-indigo-300 hover:bg-slate-50"
                  )}
                >
                  <div className="pt-1">
                    <div className={clsx(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedCentreId === centre.id ? "border-indigo-600" : "border-slate-300"
                    )}>
                      {selectedCentreId === centre.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
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
                    <h3 className="font-semibold text-slate-900">{centre.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{centre.district} • {centre.code}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep('requirements')}
                disabled={isProcessing}
                className="text-slate-600 font-medium px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSelectCentre}
                disabled={!selectedCentreId || isProcessing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm"
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
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Send size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review & Submit</h2>
                <p className="text-sm text-slate-500">Verify your request details before submitting.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4 mb-8">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Service</div>
                <div className="font-medium text-slate-900">{service.name}</div>
              </div>
              
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Base Fee</div>
                <div className="font-medium text-slate-900">{service.base_fee ? `₹${service.base_fee}` : 'Free'}</div>
              </div>

              {selectedCentreId && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Selected Centre</div>
                  <div className="font-medium text-slate-900">
                    {centres.find(c => c.id === selectedCentreId)?.name}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-8">
              By submitting this request, you agree to provide all mandatory documents to the Akshaya Centre for processing.
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => centres.length > 0 ? setCurrentStep('centre') : setCurrentStep('requirements')}
                disabled={isProcessing}
                className="text-slate-600 font-medium px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-sm shadow-indigo-200 transform hover:-translate-y-0.5"
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
