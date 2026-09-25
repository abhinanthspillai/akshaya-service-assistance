import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, RefreshCw, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function PendingApproval() {
  const { user, refreshUser, logout } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const updatedUser = await refreshUser();
      if (updatedUser?.approval_status === 'APPROVED') {
        setStatusMessage('Your account is approved! Redirecting...');
        window.location.reload();
      } else {
        setStatusMessage('Your account is still awaiting approval by your centre administrator.');
      }
    } catch {
      setStatusMessage('Unable to check approval status right now. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 border border-amber-100">
          <Clock size={32} />
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800 mb-3">
          Awaiting Approval
        </span>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Registration Pending Approval
        </h1>

        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Welcome to SAHAYA, <strong className="text-slate-900">{user?.full_name || user?.email}</strong>.
          Your Akshaya Centre Employee account has been registered and is pending verification.
          Before you can access the request queue, your centre administrator must approve your account.
        </p>

        {statusMessage && (
          <div className="mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2 text-left">
            <ShieldAlert size={16} className="text-amber-500 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm"
          >
            <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
            {isChecking ? 'Checking status...' : 'Check Approval Status'}
          </button>

          <button
            onClick={logout}
            className="w-full bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium py-3 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          If you believe this is an error or need immediate access, please contact your Akshaya Centre Administrator.
        </p>
      </div>
    </div>
  );
}
