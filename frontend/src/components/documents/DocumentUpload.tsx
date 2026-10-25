import React, { useRef } from 'react';
import { api } from '../../lib/api';
import { Upload, X, File as FileIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

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
  size_bytes: number;
}

export type DocumentUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

interface DocumentUploadProps {
  requestId: string;
  requirement: Requirement;
  existingDocument?: RequestDocument;
  stagedFile?: File | null;
  onSelectFile: (file: File) => void;
  onRemoveStagedFile: () => void;
  uploadStatus?: DocumentUploadStatus;
  uploadErrorMessage?: string | null;
  disabled?: boolean;
}

export function DocumentUpload({
  requestId,
  requirement,
  existingDocument,
  stagedFile,
  onSelectFile,
  onRemoveStagedFile,
  uploadStatus,
  uploadErrorMessage,
  disabled = false,
}: DocumentUploadProps) {
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxMb = requirement.max_file_size_bytes ? requirement.max_file_size_bytes / (1024 * 1024) : 5;

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSelectFile = (selectedFile: File) => {
    setLocalError(null);
    const maxBytes = requirement.max_file_size_bytes || 5 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setLocalError(`File exceeds maximum size of ${maxMb} MB.`);
      return;
    }
    const allowedMimeTypes = requirement.allowed_file_types.map(ft => ft.mime_type.toLowerCase());
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
    const validMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    const isAllowedMime = allowedMimeTypes.length > 0
      ? allowedMimeTypes.includes(selectedFile.type.toLowerCase())
      : validMimes.includes(selectedFile.type.toLowerCase());

    if (!hasValidExt || !isAllowedMime) {
      setLocalError('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
      return;
    }

    onSelectFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const displayError = localError || uploadErrorMessage;

  return (
    <div className="bg-mono-bg p-4 rounded-xl border border-mono-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-mono-text flex items-center gap-3 text-[16px] leading-tight">
            {requirement.name}
          </h3>
          {!existingDocument && !stagedFile && requirement.description && (
            <p className="text-[13px] text-mono-muted mt-2">{requirement.description}</p>
          )}
          {!existingDocument && !stagedFile && (
            <p className="text-[12px] font-medium text-mono-muted mt-3 uppercase tracking-wider">
              PDF, JPEG, PNG • Maximum {maxMb} MB
            </p>
          )}
        </div>


      </div>

      {/* Show staged file if user selected one */}
      {stagedFile ? (
        <div className="mt-3">
          <div className={clsx(
            "w-full flex items-center justify-between bg-white p-3 rounded-lg shadow-xs border transition-all",
            uploadStatus === 'failed' || displayError ? "border-red-300 bg-red-50/50" :
            uploadStatus === 'uploaded' ? "border-green-300 bg-green-50/50" :
            "border-mono-border"
          )}>
            <div className="flex items-center gap-2.5 truncate pr-3">
              {uploadStatus === 'uploaded' ? (
                <CheckCircle2 className="text-green-600 shrink-0" size={18} />
              ) : (
                <FileIcon className="text-blue-600 shrink-0" size={18} />
              )}
              <div className="flex flex-col truncate">
                <span className="text-[14px] font-medium text-mono-text truncate">{stagedFile.name}</span>
                <span className="text-[11px] text-mono-muted">
                  {(stagedFile.size / 1024 / 1024).toFixed(2)} MB
                  {uploadStatus === 'uploading' && ' • Uploading...'}
                  {uploadStatus === 'uploaded' && ' • Uploaded successfully'}
                  {uploadStatus === 'failed' && ' • Upload failed'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setLocalError(null);
                  onRemoveStagedFile();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 text-mono-muted hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                aria-label="Remove staged file"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : existingDocument ? (
        /* If already uploaded to server and not replaced with staged file */
        <div className="mt-4 flex flex-col gap-3">
          <div className={clsx(
            "rounded-xl p-4 flex flex-col gap-3 border",
            existingDocument.status === 'REJECTED' ? "bg-red-50 border-red-200" :
            existingDocument.status === 'REUPLOAD_REQUIRED' ? "bg-orange-50 border-orange-200" :
            "bg-green-50 border-green-200"
          )}>
            <div className="flex items-start gap-3">
              {existingDocument.status === 'REJECTED' || existingDocument.status === 'REUPLOAD_REQUIRED' ? (
                <AlertCircle className={existingDocument.status === 'REJECTED' ? "text-red-600 mt-0.5" : "text-orange-600 mt-0.5"} size={20} />
              ) : (
                <CheckCircle2 className="text-green-600 mt-0.5" size={20} />
              )}
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-mono-text">
                  {existingDocument.original_filename}
                </p>
                <p className="text-[13px] text-mono-muted mt-0.5">
                  {(existingDocument.size_bytes / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className={clsx("text-[13px] font-medium mt-2",
                  existingDocument.status === 'REJECTED' ? "text-red-700" :
                  existingDocument.status === 'REUPLOAD_REQUIRED' ? "text-orange-700" :
                  "text-green-700"
                )}>
                  {existingDocument.status === 'PENDING' ? 'Uploaded' : 
                   existingDocument.status === 'REUPLOAD_REQUIRED' ? 'Re-upload Required' :
                   existingDocument.status.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            {existingDocument.employee_remarks && (
              <div className="bg-white/60 p-3 rounded-lg text-sm text-ink-900 border border-black/5 mt-1">
                <span className="font-semibold text-mono-text">Remarks:</span> {existingDocument.employee_remarks}
              </div>
            )}
            
            <div className="mt-2 flex items-center gap-4">
              <a 
                href={`${api.defaults.baseURL}/requests/${requestId}/documents/${existingDocument.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-semibold text-mono-text hover:text-black transition-colors"
              >
                Preview Document
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Empty drag-and-drop zone */
        <div
          className={clsx(
            "transition-all duration-200 ease-in-out flex flex-col items-center justify-center cursor-pointer",
            "mt-3 p-4 border-2 border-dashed rounded-lg",
            isDragging ? "border-mono-text bg-blue-600/5" : "border-mono-border hover:border-mono-muted",
            displayError ? "border-red-600/50 bg-red-50" : ""
          )}
          onClick={() => {
            if (!disabled) fileInputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center text-center">
            <Upload size={18} className="text-mono-muted mb-2" />
            <p className="text-[13px] font-medium text-mono-text mb-0.5">Drop file here or click to browse</p>
            <p className="text-[11px] text-mono-muted">Up to {maxMb} MB</p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={requirement.allowed_file_types?.map(t => t.mime_type).join(',') || '.pdf,.jpg,.jpeg,.png'}
        onChange={handleFileChange}
        disabled={disabled}
      />

      {displayError && (
        <div className="flex items-center gap-2 text-red-600 text-[13px] mt-3 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
          <AlertCircle size={14} className="shrink-0" />
          {displayError}
        </div>
      )}
    </div>
  );
}
