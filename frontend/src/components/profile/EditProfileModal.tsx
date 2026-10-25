import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

export type ProfileEditSection = 'all' | 'personal' | 'address' | 'linked';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  section?: ProfileEditSection;
}

export function EditProfileModal({ isOpen, onClose, section = 'all' }: EditProfileModalProps) {
  const { user, refreshUser } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address_text: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        address_text: user.address_text || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Send only relevant fields based on section
    const payload: Partial<typeof formData> = {};
    if (section === 'all' || section === 'personal') {
      payload.full_name = formData.full_name;
      payload.phone = formData.phone;
    }
    if (section === 'all' || section === 'address') {
      payload.address_text = formData.address_text;
    }
    if (section === 'linked') {
      payload.phone = formData.phone;
    }

    try {
      await api.patch('/users/me', payload);
      await refreshUser();
      onClose();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      setError(anyErr.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (section) {
      case 'personal':
        return 'Edit Personal Information';
      case 'address':
        return 'Edit Address Information';
      case 'linked':
        return 'Edit Contact Details';
      case 'all':
      default:
        return 'Edit Profile';
    }
  };

  const showFullName = section === 'all' || section === 'personal';
  const showPhone = section === 'all' || section === 'personal' || section === 'linked';
  const showAddress = section === 'all' || section === 'address';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-mono-border bg-mono-surface/30">
          <h2 className="text-xl font-bold text-mono-text">{getTitle()}</h2>
          <button 
            onClick={onClose}
            className="text-mono-muted hover:text-mono-text transition-colors p-2 hover:bg-mono-surface rounded-full"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}
          
          {showFullName && (
            <div>
              <label className="block text-sm font-bold text-mono-text mb-1.5">
                Full Name
              </label>
              <input 
                type="text"
                required
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-mono-border bg-mono-bg text-mono-text focus:outline-none focus:ring-2 focus:ring-mono-text/20 transition-all font-medium"
                placeholder="Enter your full name"
              />
            </div>
          )}
          
          {showPhone && user?.role === 'citizen' && (
            <div>
              <label className="block text-sm font-bold text-mono-text mb-1.5">
                Phone Number
              </label>
              <input 
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-mono-border bg-mono-bg text-mono-text focus:outline-none focus:ring-2 focus:ring-mono-text/20 transition-all font-medium"
                placeholder="Enter your phone number"
              />
            </div>
          )}
          
          {showAddress && user?.role === 'citizen' && (
            <div>
              <label className="block text-sm font-bold text-mono-text mb-1.5">
                Address
              </label>
              <textarea 
                value={formData.address_text}
                onChange={e => setFormData({ ...formData, address_text: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-mono-border bg-mono-bg text-mono-text focus:outline-none focus:ring-2 focus:ring-mono-text/20 transition-all font-medium resize-none"
                placeholder="Enter your full address"
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-mono-text hover:bg-mono-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-mono-text text-mono-bg hover:bg-mono-text/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
