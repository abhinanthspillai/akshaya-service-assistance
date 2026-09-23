import React, { useState, useRef } from 'react';
import { api } from '../../lib/api';
import { Upload, X, File as FileIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { AxiosError } from 'axios';

interface Requirement {
  id: string;
  name: string;
  description: string | null;
  requirement_type: string;
  conditional_rule: string | null;
  max_file_size_bytes: number | null;
  allowed_file_types: Array<{ mime_type: string }>;
}

interface RequestDocument {
  id: string;
  original_filename: string;
  status: string;
  employee_remarks: string | null;
  requirement_id: string;
}

interface DocumentUploadProps {
  requestId: string;
  requirement: Requirement;
  existingDocument?: RequestDocument;
  onUploadSuccess: (document: RequestDocument) => void;
}

export function DocumentUpload({ requestId, requirement, existingDocument, onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxMb = requirement.max_file_size_bytes ? requirement.max_file_size_bytes / (1024 * 1024) : 5;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (requirement.max_file_size_bytes && selectedFile.size > requirement.max_file_size_bytes) {
      setError(`File exceeds maximum size of ${maxMb} MB`);
      return;
    }
    const allowedTypes = requirement.allowed_file_types.map(ft => ft.mime_type);
    if (allowedTypes.length > 0 && !allowedTypes.includes(selectedFile.type)) {
      const exts = allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ');
      setError(`Only ${exts} files are allowed.`);
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('requirement_id', requirement.id);
    formData.append('file', file);

    try {
      const res = await api.post(`/requests/${requestId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess(res.data);
    } catch (err) {
      const error = err as AxiosError<{ detail: string }>;
      setError(error.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-mono-bg p-4 rounded-xl border border-mono-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-mono-text flex items-center gap-2 text-sm leading-tight">
            {requirement.name}
            {requirement.requirement_type === 'REQUIRED' && (
              <span className="text-red-600 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-50 rounded">Required</span>
            )}
            {requirement.requirement_type === 'CONDITIONAL' && (
              <span className="text-orange-500 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-orange-50 rounded">Conditional</span>
            )}
            {requirement.requirement_type === 'OPTIONAL' && (
              <span className="text-mono-muted text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-mono-surface rounded">Optional</span>
            )}
          </h3>
          {requirement.description && (
            <p className="text-xs text-mono-muted mt-1">{requirement.description}</p>
          )}
          {requirement.conditional_rule && requirement.requirement_type === 'CONDITIONAL' && (
            <p className="text-[11px] text-orange-500 mt-1 italic">When to upload: {requirement.conditional_rule}</p>
          )}
        </div>
        {!existingDocument && !file && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-[13px] font-semibold bg-white border border-mono-border px-3 py-1.5 rounded-lg text-mono-text hover:bg-mono-surface transition-colors"
          >
            Choose File
          </button>
        )}
      </div>

      {existingDocument ? (
        <div className={clsx(
          "mt-3 border rounded-lg p-3 flex flex-col gap-2",
          existingDocument.status === 'REJECTED' ? "bg-red-50 border-red-200" :
          existingDocument.status === 'REUPLOAD_REQUIRED' ? "bg-orange-50 border-orange-200" :
          "bg-green-50 border-green-200"
        )}>
          <div className="flex items-center gap-3">
            {existingDocument.status === 'REJECTED' || existingDocument.status === 'REUPLOAD_REQUIRED' ? (
              <AlertCircle className={existingDocument.status === 'REJECTED' ? "text-red-600" : "text-orange-600"} size={20} />
            ) : (
              <CheckCircle2 className="text-green-600" size={20} />
            )}
            <div className="flex-1">
              <p className={clsx("text-sm font-semibold", 
                existingDocument.status === 'REJECTED' ? "text-red-900" :
                existingDocument.status === 'REUPLOAD_REQUIRED' ? "text-orange-900" :
                "text-green-900"
              )}>
                {existingDocument.original_filename}
              </p>
              <p className={clsx("text-[11px] mt-0.5",
                existingDocument.status === 'REJECTED' ? "text-red-700" :
                existingDocument.status === 'REUPLOAD_REQUIRED' ? "text-orange-700" :
                "text-green-700"
              )}>
                Status: {existingDocument.status.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          {existingDocument.employee_remarks && (
            <div className="bg-white/60 p-2.5 rounded-md text-xs text-ink-900 border border-black/5 mt-1">
              <span className="font-semibold">Remarks:</span> {existingDocument.employee_remarks}
            </div>
          )}
        </div>
      ) : (
        <div
          className={clsx(
            "transition-all duration-200 ease-in-out flex flex-col items-center justify-center",
            (isDragging || error || file) ? "mt-3 p-4 border-2 border-dashed rounded-lg" : "h-0 overflow-hidden opacity-0 p-0 border-0",
            isDragging ? "border-mono-text bg-blue-600/5" : "border-mono-border",
            error ? "border-red-600/50 bg-red-50" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="w-full flex items-center justify-between bg-white p-2.5 rounded-lg shadow-sm border border-mono-border">
              <div className="flex items-center gap-2.5 truncate pr-3">
                <FileIcon className="text-blue-600 shrink-0" size={16} />
                <span className="text-[13px] font-medium text-mono-text truncate">{file.name}</span>
                <span className="text-[11px] text-mono-muted shrink-0">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setFile(null)}
                  className="p-1.5 text-mono-muted hover:text-red-600 hover:bg-red-50 rounded-md transition"
                  disabled={isUploading}
                >
                  <X size={14} />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-mono-text text-white text-[11px] font-semibold px-3 py-1.5 rounded-md hover:bg-black transition flex items-center gap-1.5 disabled:opacity-70"
                >
                  {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Upload
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Upload size={18} className="text-mono-muted mb-2" />
              <p className="text-[13px] font-medium text-mono-text mb-0.5">Drop file here</p>
              <p className="text-[11px] text-mono-muted">Up to {maxMb} MB</p>
            </div>
          )}
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={requirement.allowed_file_types.map(t => t.mime_type).join(',')}
        onChange={handleFileChange}
      />
      
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-[13px] mt-3 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
