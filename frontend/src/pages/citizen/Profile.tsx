import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, MapPin, FileText, Trash2, Edit2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { EditProfileModal, ProfileEditSection } from '../../components/profile/EditProfileModal';

export function Profile() {
  const { user, refreshUser } = useAuth();
  const [photoError, setPhotoError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSection, setEditSection] = useState<ProfileEditSection>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEdit = (section: ProfileEditSection) => {
    setEditSection(section);
    setIsEditModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('File too large. Maximum 2 MB allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Only JPEG, PNG, and WebP are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      setPhotoError(anyErr.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoError('');
    try {
      await api.delete('/users/me/photo');
      await refreshUser();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      setPhotoError(anyErr.response?.data?.detail || 'Failed to remove photo');
    }
  };

  const fullName = user?.full_name || 'Sample';
  const email = user?.email || 'sample@example.com';
  const role = user?.role.replace('_', ' ') || 'Citizen';

  return (
    <>
      <div className="max-w-[1400px] mx-auto pb-12">
        {/* Header */}
        <div className="mb-8 border-b border-mono-border pb-6">
          <h1 className="text-3xl font-bold text-mono-text tracking-tight">Profile</h1>
          <p className="text-sm font-medium text-mono-muted mt-2">Manage your personal information and contact details.</p>
        </div>

        {/* Top Card: Basic Info */}
        <div className="bg-mono-bg rounded-2xl border border-mono-border p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative">
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <div className="relative group shrink-0">
              <Avatar photoUrl={user?.photo_url ? `${user.photo_url}?ts=${Date.now()}` : undefined} name={fullName} className="w-20 h-20 md:w-24 md:h-24 text-3xl md:text-4xl" />
              <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={isUploading} />
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} />}
                <span className="text-xs font-medium mt-1">Change</span>
              </label>
              {user?.photo_url && (
                <button onClick={handlePhotoRemove} className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors" title="Remove Photo">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-mono-text mb-1">{fullName}</h2>
              <p className="text-sm font-medium text-mono-muted mb-2 capitalize">{role}</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-mono-text/70">
                <User size={14} />
                <span>#{user?.id ? user.id.substring(0, 8).toUpperCase() : 'UNKNOWN'}</span>
              </div>
              {photoError && <p className="text-sm text-red-600 mt-2 font-medium">{photoError}</p>}
            </div>
          </div>
          
          <div className="absolute top-6 right-6 md:static">
            <button 
              onClick={() => handleOpenEdit('all')} 
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-mono-border bg-mono-bg text-sm font-medium text-mono-text hover:bg-mono-surface transition-colors shadow-sm cursor-pointer"
            >
              <Edit2 size={16} /> Edit Profile
            </button>
          </div>
        </div>

        {/* 2-Column Balanced Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1: Personal Information & Linked Information */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
                <div className="flex items-center gap-3">
                  <User size={20} className="text-mono-text" />
                  <h3 className="font-bold text-mono-text text-base">Personal Information</h3>
                </div>
                <button 
                  onClick={() => handleOpenEdit('personal')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg cursor-pointer"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <div className="p-2 flex-1">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-mono-border/50">
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted w-1/3">Full Name</td>
                      <td className="py-4 pr-4 font-bold text-mono-text">{fullName}</td>
                    </tr>
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted">Phone Number</td>
                      <td className="py-4 pr-4 font-bold text-mono-text">{user?.phone || <span className="text-mono-muted font-medium italic">Not provided</span>}</td>
                    </tr>
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted">Email Address</td>
                      <td className="py-4 pr-4 font-bold text-mono-text">{email}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Linked Information */}
            <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-mono-text" />
                  <h3 className="font-bold text-mono-text text-base">Linked Information</h3>
                </div>
                <button 
                  onClick={() => handleOpenEdit('linked')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg cursor-pointer"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <div className="p-2 flex-1">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-mono-border/50">
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted w-2/5">Aadhaar Number</td>
                      <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
                    </tr>
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted">Mobile Number</td>
                      <td className="py-4 pr-4 font-bold text-mono-text flex items-center justify-between gap-2">
                        <span>{user?.phone || <span className="text-mono-muted font-medium italic">Not provided</span>}</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-mono-surface/30 transition-colors">
                      <td className="py-4 pl-4 font-medium text-mono-muted">Email Address</td>
                      <td className="py-4 pr-4 font-bold text-mono-text flex items-center justify-between gap-2">
                        <span className="truncate">{email}</span>
                        <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0">Verified</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Column 2: Address Information & Account Deletion */}
          <div className="space-y-6">
            {/* Address Information */}
            <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
                <div className="flex items-center gap-3">
                  <MapPin size={20} className="text-mono-text" />
                  <h3 className="font-bold text-mono-text text-base">Address Information</h3>
                </div>
                <button 
                  onClick={() => handleOpenEdit('address')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg cursor-pointer"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <div className="p-6 flex-1 min-h-[175px]">
                {user?.address_text ? (
                  <p className="text-sm font-medium text-mono-text whitespace-pre-line leading-relaxed">
                    {user.address_text}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-mono-muted">
                    <MapPin size={32} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">No address provided</p>
                  </div>
                )}
              </div>
            </div>

            {/* Delete Account */}
            <div className="bg-mono-surface/50 rounded-2xl border border-mono-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-mono-bg border border-mono-border flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-mono-text" />
                </div>
                <div>
                  <h4 className="font-bold text-mono-text text-sm mb-1">Delete Account</h4>
                  <p className="text-xs font-medium text-mono-muted">Permanently delete your account and all associated data.</p>
                </div>
              </div>
              <button className="px-5 py-2.5 rounded-xl border border-red-500/30 text-red-600 bg-white hover:bg-red-50 text-sm font-bold transition-colors whitespace-nowrap self-start sm:self-center">
                Delete Account
              </button>
            </div>
          </div>

        </div>
      </div>
      
      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        section={editSection}
      />
    </>
  );
}
