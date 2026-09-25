import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Eye, EyeOff, Loader2, Building2, User as UserIcon, ShieldAlert } from 'lucide-react';

interface CentreOption {
  id: string;
  name: string;
  code: string;
  district: string;
  locality?: string;
}

export function RegisterForm() {
  const [role, setRole] = useState<'citizen' | 'centre_employee'>('citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [centreId, setCentreId] = useState('');
  const [centres, setCentres] = useState<CentreOption[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'centre_employee' && centres.length === 0) {
      setLoadingCentres(true);
      api
        .get('/centres/?active=true')
        .then((res) => {
          setCentres(res.data);
          if (res.data.length > 0 && !centreId) {
            setCentreId(res.data[0].id);
          }
        })
        .catch(() => {
          setError('Failed to load Akshaya centres list. Please try again.');
        })
        .finally(() => {
          setLoadingCentres(false);
        });
    }
  }, [role, centres.length, centreId]);

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

    if (role === 'centre_employee' && !centreId) {
      setError('Please select your Akshaya Centre');
      return;
    }

    setIsLoading(true);

    try {
      const payload: {
        email: string;
        password: string;
        full_name: string;
        role: string;
        centre_id?: string;
      } = {
        email,
        password,
        full_name: fullName,
        role,
      };

      if (role === 'centre_employee') {
        payload.centre_id = centreId;
      }

      await api.post('/auth/register', payload);
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
    <div className="w-full max-w-sm mx-auto flex flex-col justify-start flex-1 pb-6">
      <div className="mb-5 shrink-0">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 mb-1.5 text-center md:text-left">Create account</h2>
        <p className="text-ink-500 text-sm text-center md:text-left">
          Access citizen services or staff request operations.
        </p>
      </div>

      {/* Role Selection Toggle */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-ink-50 rounded-2xl mb-5 border border-ink-100 shrink-0">
        <button
          type="button"
          onClick={() => {
            setRole('citizen');
            setError('');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            role === 'citizen'
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          <UserIcon size={14} />
          Citizen
        </button>
        <button
          type="button"
          onClick={() => {
            setRole('centre_employee');
            setError('');
          }}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            role === 'centre_employee'
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          <Building2 size={14} />
          Centre Staff
        </button>
      </div>

      {role === 'centre_employee' && (
        <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
          <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Employee Notice:</strong> Account requires Akshaya Centre approval before queue access is granted.
          </span>
        </div>
      )}

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

        {role === 'centre_employee' && (
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1.5">
              Assigned Akshaya Centre
            </label>
            {loadingCentres ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-ink-50/50 rounded-2xl border border-ink-100 text-sm text-ink-400">
                <Loader2 size={16} className="animate-spin" />
                Loading centres...
              </div>
            ) : (
              <select
                required
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                className="w-full px-4 py-3 bg-ink-50/50 rounded-2xl border border-ink-100 focus:bg-white focus:border-ink-900 focus:ring-4 focus:ring-ink-900/10 outline-none transition-all text-ink-900 text-sm"
              >
                <option value="" disabled>Select an Akshaya Centre</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.district})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ink-900 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
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
              type={showPassword ? 'text' : 'password'}
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
