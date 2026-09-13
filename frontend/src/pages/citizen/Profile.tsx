import { useAuth } from '../../contexts/AuthContext';
import { Mail, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 flex items-start gap-6 border-b border-slate-100">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-indigo-700">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 pt-2">
            <h2 className="text-2xl font-bold text-slate-900">{user?.full_name || 'Citizen'}</h2>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail size={16} className="text-slate-400" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Shield size={16} className="text-slate-400" />
                <span className="capitalize">{user?.role.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Account Settings</h3>
          <p className="text-sm text-slate-500 mb-6">
            Profile editing functionality (phone number, address) is planned for a future release. 
            Currently, your primary identification is your registered email.
          </p>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-red-600 transition-colors shadow-sm"
          >
            <LogOut size={18} />
            Sign out of your account
          </button>
        </div>
      </div>
    </div>
  );
}
