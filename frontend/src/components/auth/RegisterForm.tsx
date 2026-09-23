import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function RegisterForm() {
 const [fullName, setFullName] = useState('');
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [error, setError] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 
 const navigate = useNavigate();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');

 if (password !== confirmPassword) {
 setError('Passwords do not match');
 return;
 }

 if (password.length < 8) {
 setError('Password must be at least 8 characters long');
 return;
 }

 setIsLoading(true);

 try {
 await api.post('/auth/register', {
 email,
 password,
 full_name: fullName,
 });
 navigate('/login', { replace: true });
 } catch (error) {
 const e = error as { response?: { data?: { detail?: string | { msg: string }[] } } };
 if (!e.response) {
 setError('Backend is unavailable. Please try again later.');
 return;
 }
 const data = e.response.data;
 if (data && data.detail) {
 if (Array.isArray(data.detail)) {
 const msg = data.detail.map((err: { msg: string }) => err.msg).join(', ');
 setError(`Validation error: ${msg}`);
 } else if (typeof data.detail === 'string') {
 setError(data.detail);
 } else {
 setError('An unexpected error occurred.');
 }
 } else {
 setError('Failed to create account. Please try again.');
 }
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="w-full max-w-sm mx-auto flex flex-col justify-center h-full">
 <h2 className="text-3xl font-bold text-ink-900 mb-2 text-center md:text-left">Create account</h2>
 <p className="text-ink-500 mb-8 text-sm text-center md:text-left">
 Access citizen services anytime, anywhere.
 </p>

 {error && (
 <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-ink-900 mb-1.5">Full Name</label>
 <input
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full px-4 py-3 bg-ink-50/50 rounded-2xl border border-ink-100 focus:bg-white focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 outline-none transition-all placeholder:text-ink-400 text-ink-900"
 placeholder="John Doe"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-ink-900 mb-1.5">Your email</label>
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full px-4 py-3 bg-ink-50/50 rounded-2xl border border-ink-100 focus:bg-white focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 outline-none transition-all placeholder:text-ink-400 text-ink-900"
 placeholder="example@gmail.com"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-ink-900 mb-1.5">Password</label>
 <div className="relative">
 <input
 type={showPassword ? "text" : "password"}
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full px-4 py-3 bg-ink-50/50 rounded-2xl border border-ink-100 focus:bg-white focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 outline-none transition-all placeholder:text-ink-400 text-ink-900 pr-10"
 placeholder="••••••••"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-semibold text-ink-900 mb-1.5">Confirm</label>
 <input
 type={showPassword ? "text" : "password"}
 required
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className="w-full px-4 py-3 bg-ink-50/50 rounded-2xl border border-ink-100 focus:bg-white focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 outline-none transition-all placeholder:text-ink-400 text-ink-900"
 placeholder="••••••••"
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={isLoading}
 className="w-full bg-ink-900 hover:bg-ink-800 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
 >
 {isLoading && <Loader2 size={18} className="animate-spin" />}
 {isLoading ? 'Creating...' : 'Create Account'}
 </button>
 </form>
 </div>
 );
}
