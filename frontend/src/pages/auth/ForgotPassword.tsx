import { Link } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Info } from 'lucide-react';

export function ForgotPassword() {
 return (
 <AuthLayout>
 <h2 className="text-3xl font-bold text-ink-900 mb-2">Password Recovery</h2>
 <p className="text-ink-500 mb-8 text-sm">
 Information about regaining access to your account.
 </p>

 <div className="bg-indigo-50 text-indigo-800 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4 mb-8">
 <Info className="flex-shrink-0 text-ink-900 mt-0.5" />
 <div className="text-sm">
 <p className="font-semibold mb-1">Self-service recovery is not available yet.</p>
 <p className="text-ink-900 leading-relaxed">
 Please contact your local Akshaya Centre administrator or Akshaya Support to request a password reset. 
 Once authorized, they will issue you a temporary login credential.
 </p>
 </div>
 </div>
 
 <Link 
 to="/login"
 className="w-full bg-white border border-ink-100 hover:bg-ink-50 text-ink-900 font-semibold py-3.5 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
 >
 Return to Sign In
 </Link>
 </AuthLayout>
 );
}
