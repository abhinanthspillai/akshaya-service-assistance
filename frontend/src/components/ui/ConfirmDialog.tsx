import { ReactNode } from 'react';
import { Button } from './Button';
import { AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div 
        className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              isDestructive ? "bg-red-100 text-red-600" : "bg-mono-surface text-mono-text"
            )}>
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-mono-text leading-tight">{title}</h3>
                <button 
                  onClick={onCancel}
                  disabled={isLoading}
                  className="text-mono-muted hover:text-mono-text transition-colors -mt-1 -mr-2 p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="text-sm font-medium text-mono-muted">
                {message}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-mono-bg px-6 py-4 flex justify-end gap-3 border-t border-mono-border">
          <Button 
            variant="ghost" 
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button 
            variant={isDestructive ? 'primary' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className={isDestructive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
