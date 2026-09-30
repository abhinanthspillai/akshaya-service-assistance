import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, MapPin, ShieldCheck, Lock, FileText, Edit2, ChevronRight, X, Check } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

export function Profile() {
  const { user, refreshUser } = useAuth();
  
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth || '',
    gender: user?.gender || '',
    address_line1: user?.address_line1 || '',
    address_line2: user?.address_line2 || '',
    city: user?.city || '',
    district: user?.district || '',
    state: user?.state || '',
    pin_code: user?.pin_code || ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordError, setPasswordError] = useState('');

  const fullName = user?.full_name || 'Sample User';
  const initial = fullName.charAt(0).toUpperCase();
  const email = user?.email || 'sample@example.com';
  const role = user?.role.replace('_', ' ') || 'Citizen';
  const isEmployee = user?.role === 'centre_employee';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (section: 'personal' | 'address') => {
    setIsSaving(true);
    try {
      await api.patch('/auth/me/profile', formData);
      await refreshUser();
      if (section === 'personal') setIsEditingPersonal(false);
      if (section === 'address') setIsEditingAddress(false);
      alert('Profile updated successfully');
    } catch (err: unknown) {
      alert((err as any).response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.put('/auth/me/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      alert('Password changed successfully');
      setIsChangingPassword(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: unknown) {
      setPasswordError((err as any).response?.data?.detail || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="mb-8 border-b border-mono-border pb-6">
        <h1 className="text-3xl font-bold text-mono-text tracking-tight">Profile</h1>
        <p className="text-sm font-medium text-mono-muted mt-2">Manage your personal information and account settings.</p>
      </div>

      {/* Top Card: Basic Info */}
      <div className="bg-mono-bg rounded-2xl border border-mono-border p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-mono-surface flex items-center justify-center shrink-0">
            <span className="text-4xl font-bold text-mono-text">{initial}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-mono-text mb-1">{fullName}</h2>
            <p className="text-sm font-medium text-mono-muted mb-2 capitalize">{role}</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-mono-text/70">
              <User size={14} />
              <span>#{user?.id ? user.id.substring(0, 8).toUpperCase() : 'UNKNOWN'}</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsEditingPersonal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-mono-border text-sm font-bold text-mono-text hover:bg-mono-surface transition-colors self-start md:self-center shrink-0"
        >
          <Edit2 size={16} /> Edit Profile
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Information */}
        <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
            <div className="flex items-center gap-3">
              <User size={20} className="text-mono-text" />
              <h3 className="font-bold text-mono-text text-base">Personal Information</h3>
            </div>
            {!isEditingPersonal ? (
              <button 
                onClick={() => setIsEditingPersonal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg"
              >
                <Edit2 size={12} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditingPersonal(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg"
                >
                  <X size={12} /> Cancel
                </button>
                <button 
                  onClick={() => handleSave('personal')}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent text-xs font-bold text-mono-bg bg-mono-text hover:bg-mono-text/90 transition-colors"
                >
                  <Check size={12} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          <div className="p-2 flex-1">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-mono-border/50">
                <tr className="hover:bg-mono-surface/30 transition-colors">
                  <td className="py-4 pl-4 font-medium text-mono-muted w-1/3">Full Name</td>
                  <td className="py-4 pr-4 font-bold text-mono-text">
                    {isEditingPersonal ? (
                      <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                    ) : (
                      formData.full_name || <span className="text-mono-muted font-medium italic">Not provided</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-mono-surface/30 transition-colors">
                  <td className="py-4 pl-4 font-medium text-mono-muted">Phone Number</td>
                  <td className="py-4 pr-4 font-bold text-mono-text">
                    {isEditingPersonal ? (
                      <input type="text" name="phone" maxLength={10} value={formData.phone} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" placeholder="10 digit number" />
                    ) : (
                      formData.phone || <span className="text-mono-muted font-medium italic">Not provided</span>
                    )}
                  </td>
                </tr>
                {!isEmployee && (
                  <>
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted">Date of Birth</td>
                      <td className="py-4 pr-4 font-bold text-mono-text">
                        {isEditingPersonal ? (
                          <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                        ) : (
                          formData.date_of_birth || <span className="text-mono-muted font-medium italic">Not provided</span>
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted">Gender</td>
                      <td className="py-4 pr-4 font-bold text-mono-text">
                        {isEditingPersonal ? (
                          <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm">
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          formData.gender || <span className="text-mono-muted font-medium italic">Not provided</span>
                        )}
                      </td>
                    </tr>
                  </>
                )}
                <tr className="hover:bg-mono-surface/30 transition-colors">
                  <td className="py-4 pl-4 font-medium text-mono-muted">Email Address</td>
                  <td className="py-4 pr-4 font-bold text-mono-text">{email}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Address Information */}
        {!isEmployee && (
          <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-mono-text" />
                <h3 className="font-bold text-mono-text text-base">Address Information</h3>
              </div>
              {!isEditingAddress ? (
                <button 
                  onClick={() => setIsEditingAddress(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg"
                >
                  <Edit2 size={12} /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsEditingAddress(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg"
                  >
                    <X size={12} /> Cancel
                  </button>
                  <button 
                    onClick={() => handleSave('address')}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-transparent text-xs font-bold text-mono-bg bg-mono-text hover:bg-mono-text/90 transition-colors"
                  >
                    <Check size={12} /> {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            <div className="p-2 flex-1">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-mono-border/50">
                  <tr className="hover:bg-mono-surface/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-mono-muted w-1/3">Address Line 1</td>
                    <td className="py-4 pr-4 font-bold text-mono-text">
                      {isEditingAddress ? (
                        <input type="text" name="address_line1" value={formData.address_line1} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                      ) : (
                        formData.address_line1 || <span className="text-mono-muted font-medium italic">Not provided</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-mono-surface/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-mono-muted">Address Line 2</td>
                    <td className="py-4 pr-4 font-bold text-mono-text">
                      {isEditingAddress ? (
                        <input type="text" name="address_line2" value={formData.address_line2} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                      ) : (
                        formData.address_line2 || <span className="text-mono-muted font-medium italic">Not provided</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-mono-surface/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-mono-muted">City</td>
                    <td className="py-4 pr-4 font-bold text-mono-text">
                      {isEditingAddress ? (
                        <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                      ) : (
                        formData.city || <span className="text-mono-muted font-medium italic">Not provided</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-mono-surface/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-mono-muted">District</td>
                    <td className="py-4 pr-4 font-bold text-mono-text">
                      {isEditingAddress ? (
                        <input type="text" name="district" value={formData.district} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                      ) : (
                        formData.district || <span className="text-mono-muted font-medium italic">Not provided</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-mono-surface/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-mono-muted">State</td>
                    <td className="py-4 pr-4 font-bold text-mono-text">
                      {isEditingAddress ? (
                        <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                      ) : (
                        formData.state || <span className="text-mono-muted font-medium italic">Not provided</span>
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-mono-surface/30 transition-colors">
                    <td className="py-4 pl-4 font-medium text-mono-muted">PIN Code</td>
                    <td className="py-4 pr-4 font-bold text-mono-text">
                      {isEditingAddress ? (
                        <input type="text" name="pin_code" maxLength={6} value={formData.pin_code} onChange={handleChange} className="w-full p-2 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" />
                      ) : (
                        formData.pin_code || <span className="text-mono-muted font-medium italic">Not provided</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Account Settings */}
        <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-mono-border flex items-center gap-3 bg-mono-surface/30">
            <ShieldCheck size={20} className="text-mono-text" />
            <h3 className="font-bold text-mono-text text-base">Account Settings</h3>
          </div>
          <div className="p-2 flex-1">
            <ul className="divide-y divide-mono-border/50">
              <li>
                <button 
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full text-left p-4 hover:bg-mono-surface/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-start gap-4">
                    <Lock size={20} className="text-mono-text mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-mono-text text-sm mb-0.5">Change Password</h4>
                      <p className="text-xs font-medium text-mono-muted">Update your account password</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors" />
                </button>
              </li>
              {!isEmployee && (
                <li>
                  <div className="w-full text-left p-4 hover:bg-mono-surface/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-start gap-4">
                      <FileText size={20} className="text-mono-text mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-mono-text text-sm mb-0.5">Linked Information</h4>
                        <p className="text-xs font-medium text-mono-muted">Aadhaar and Verified Mobile</p>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

      </div>

      <Modal isOpen={isChangingPassword} onClose={() => setIsChangingPassword(false)} title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-bold text-mono-text mb-1">Current Password</label>
            <input 
              type="password" 
              required
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
              className="w-full p-2.5 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-mono-text mb-1">New Password</label>
            <input 
              type="password" 
              required
              minLength={8}
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
              className="w-full p-2.5 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-mono-text mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
              className="w-full p-2.5 border border-mono-border rounded-lg bg-mono-bg text-mono-text text-sm" 
            />
          </div>
          {passwordError && (
            <p className="text-red-500 text-sm font-medium">{passwordError}</p>
          )}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-mono-border">
            <button type="button" onClick={() => setIsChangingPassword(false)} className="px-4 py-2 border border-mono-border rounded-lg text-sm font-bold text-mono-text hover:bg-mono-surface">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-mono-text text-mono-bg rounded-lg text-sm font-bold hover:bg-mono-text/90">
              {isSaving ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
