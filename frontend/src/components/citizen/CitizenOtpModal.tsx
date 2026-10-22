import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export interface PendingOtpData {
  id: string;
  request_id: string;
  service_name: string;
  request_short_id: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface CitizenOtpModalProps {
  otpData: PendingOtpData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CitizenOtpModal({ otpData, isOpen, onClose, onSuccess }: CitizenOtpModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset digits and status when a new OTP modal is opened
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setError('');
      setIsSuccess(false);
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    }
  }, [isOpen, otpData?.id]);

  // Expiry countdown timer
  useEffect(() => {
    if (!isOpen || !otpData?.expires_at) {
      setSecondsLeft(null);
      return;
    }

    const calculateRemaining = () => {
      const diff = Math.floor((new Date(otpData.expires_at).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        setError('OTP expired. The centre will request a new one.');
      } else {
        setSecondsLeft(diff);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [isOpen, otpData?.expires_at]);

  if (!isOpen || !otpData) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (error) setError('');
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const chars = pastedData.split('');
      setDigits(chars);
      if (error) setError('');
      inputsRef.current[5]?.focus();
    }
  };

  const isComplete = digits.every((d) => d !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isSubmitting) return;

    const code = digits.join('');
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    if (secondsLeft !== null && secondsLeft <= 0) {
      setError('OTP expired. The centre will request a new one.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/requests/${otpData.request_id}/otp/submit`, { code });
      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } };
      const detail = apiErr.response?.data?.detail;
      if (detail && detail.toLowerCase().includes('expired')) {
        setError('OTP expired. The centre will request a new one.');
      } else {
        setError(detail || 'Failed to submit OTP. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="w-full max-w-md bg-mono-bg rounded-2xl border border-mono-border shadow-xl p-6 relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-mono-muted hover:text-mono-text hover:bg-mono-surface transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-mono-surface border border-mono-border flex items-center justify-center text-mono-text">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 id="otp-modal-title" className="text-base font-bold text-mono-text">
              Enter Government Portal OTP
            </h2>
            <p className="text-xs text-mono-muted">
              {otpData.service_name} (#{otpData.request_short_id})
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={26} />
            </div>
            <p className="text-sm font-bold text-mono-text">OTP sent to the centre</p>
            <p className="text-xs text-mono-muted">The staff member can now proceed with portal submission.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs text-mono-muted leading-relaxed">
              Enter the OTP sent by the government portal to your registered mobile number so centre staff can continue processing your request.
            </p>

            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-between gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  data-testid={`otp-input-${index}`}
                  className="w-12 h-14 text-center text-xl font-mono font-bold text-mono-text bg-mono-surface border border-mono-border rounded-xl focus:bg-mono-bg focus:border-mono-text focus:ring-2 focus:ring-mono-text/10 outline-none transition-all"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Timer Display */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-mono-muted">Time remaining:</span>
              <span
                className={`font-mono font-bold ${
                  secondsLeft !== null && secondsLeft < 60
                    ? 'text-rose-600'
                    : 'text-mono-text'
                }`}
              >
                {secondsLeft !== null
                  ? `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
                  : '--:--'}
              </span>
            </div>

            {/* Inline Error Text */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-mono-muted hover:text-mono-text hover:bg-mono-surface transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!isComplete || isSubmitting || (secondsLeft !== null && secondsLeft <= 0)}
                data-testid="submit-otp-button"
                className="px-6 py-2.5 bg-mono-text hover:bg-black text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Submit OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
