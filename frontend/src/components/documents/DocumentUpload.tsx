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
    <div className="bg-apple-bg p-5 rounded-[16px] border border-apple-muted/20">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-apple-text flex items-center gap-2">
            {requirement.name}
            {requirement.requirement_type === 'REQUIRED' && (
              <span className="text-apple-red text-xs font-bold uppercase">Required</span>
            )}
            {requirement.requirement_type === 'CONDITIONAL' && (
              <span className="text-orange-500 text-xs font-bold uppercase">Conditional</span>
            )}
            {requirement.requirement_type === 'OPTIONAL' && (
              <span className="text-apple-muted text-xs font-bold uppercase">Optional</span>
            )}
          </h3>
          {requirement.description && (
            <p className="text-sm text-apple-muted mt-1">{requirement.description}</p>
          )}
          {requirement.conditional_rule && requirement.requirement_type === 'CONDITIONAL' && (
            <p className="text-xs text-orange-500 mt-1 italic">When to upload: {requirement.conditional_rule}</p>
          )}
        </div>
      </div>

      {existingDocument ? (
        <div className={clsx(
          "border rounded-[12px] p-4 flex flex-col gap-3",
          existingDocument.status === 'REJECTED' ? "bg-red-50 border-red-200" :
          existingDocument.status === 'REUPLOAD_REQUIRED' ? "bg-orange-50 border-orange-200" :
          "bg-green-50 border-green-200"
        )}>
          <div className="flex items-center gap-3">
            {existingDocument.status === 'REJECTED' || existingDocument.status === 'REUPLOAD_REQUIRED' ? (
              <AlertCircle className={existingDocument.status === 'REJECTED' ? "text-red-600" : "text-orange-600"} size={24} />
            ) : (
              <CheckCircle2 className="text-green-600" size={24} />
            )}
            <div className="flex-1">
              <p className={clsx("text-sm font-semibold", 
                existingDocument.status === 'REJECTED' ? "text-red-900" :
                existingDocument.status === 'REUPLOAD_REQUIRED' ? "text-orange-900" :
                "text-green-900"
              )}>
                {existingDocument.original_filename}
              </p>
              <p className={clsx("text-xs mt-0.5",
                existingDocument.status === 'REJECTED' ? "text-red-700" :
                existingDocument.status === 'REUPLOAD_REQUIRED' ? "text-orange-700" :
                "text-green-700"
              )}>
                Status: {existingDocument.status.replace('_', ' ')}
              </p>
            </div>
          </div>
          {existingDocument.employee_remarks && (
            <div className="bg-white/60 p-3 rounded-[8px] text-sm text-ink-900">
              <span className="font-semibold">Remarks:</span> {existingDocument.employee_remarks}
            </div>
          )}
        </div>
      ) : (
        <div
          className={clsx(
            "border-2 border-dashed rounded-[12px] p-6 flex flex-col items-center justify-center transition-colors",
            isDragging ? "border-apple-text bg-apple-blue/5" : "border-apple-muted/30 hover:bg-apple-bg hover:border-apple-muted/50",
            error ? "border-apple-red/50 bg-apple-red/5" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="w-full flex items-center justify-between bg-white p-3 rounded-[8px] shadow-sm border border-apple-muted/10">
              <div className="flex items-center gap-3 truncate pr-4">
                <FileIcon className="text-apple-blue" size={20} />
                <span className="text-sm font-medium text-apple-text truncate">{file.name}</span>
                <span className="text-xs text-apple-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFile(null)}
                  className="p-1.5 text-apple-muted hover:text-apple-red hover:bg-apple-red/10 rounded-full transition"
                  disabled={isUploading}
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-apple-text text-white text-xs font-semibold px-4 py-1.5 rounded-[8px] hover:bg-black transition flex items-center gap-1.5 disabled:opacity-70"
                >
                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-apple-blue/10 flex items-center justify-center text-apple-text mb-3">
                <Upload size={20} />
              </div>
              <p className="text-sm font-medium text-apple-text mb-1">
                Drag and drop your file here
              </p>
              <p className="text-xs text-apple-muted mb-4">
                Supported: {requirement.allowed_file_types.length > 0 ? requirement.allowed_file_types.map(t => t.mime_type.split('/')[1].toUpperCase()).join(', ') : 'Any file'} up to {maxMb} MB
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={requirement.allowed_file_types.map(t => t.mime_type).join(',')}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-semibold bg-white border border-apple-muted/20 px-4 py-2 rounded-[8px] text-apple-text hover:bg-apple-blue/5 transition"
              >
                Choose File
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-apple-red text-sm mt-3 bg-apple-red/10 p-2.5 rounded-[8px]">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
