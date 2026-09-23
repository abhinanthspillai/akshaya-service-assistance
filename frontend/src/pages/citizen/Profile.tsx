import { useAuth } from '../../contexts/AuthContext';
import { User, MapPin, ShieldCheck, Lock, Bell, Globe, FileText, Trash2, Edit2, ChevronRight } from 'lucide-react';



export function Profile() {
 const { user } = useAuth();
 


 // Safely parse name or fallback
 const fullName = user?.full_name || 'Sample';
 const initial = fullName.charAt(0).toUpperCase();
 const email = user?.email || 'sample@example.com';
 const role = user?.role.replace('_', ' ') || 'Citizen';

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
 
 <button className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-mono-border text-sm font-bold text-mono-text hover:bg-mono-surface transition-colors self-start md:self-center shrink-0">
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
 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg">
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
 <td className="py-4 pl-4 font-medium text-mono-muted">Date of Birth</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">Gender</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">Phone Number</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">Email Address</td>
 <td className="py-4 pr-4 font-bold text-mono-text">{email}</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Address Information */}
 <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
 <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
 <div className="flex items-center gap-3">
 <MapPin size={20} className="text-mono-text" />
 <h3 className="font-bold text-mono-text text-base">Address Information</h3>
 </div>
 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg">
 <Edit2 size={12} /> Edit
 </button>
 </div>
 <div className="p-2 flex-1">
 <table className="w-full text-sm">
 <tbody className="divide-y divide-mono-border/50">
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted w-1/3">Address Line 1</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">Address Line 2</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">City</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">State</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">PIN Code</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Account Settings */}
 <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex flex-col">
 <div className="p-6 border-b border-mono-border flex items-center gap-3 bg-mono-surface/30">
 <ShieldCheck size={20} className="text-mono-text" />
 <h3 className="font-bold text-mono-text text-base">Account Settings</h3>
 </div>
 <div className="p-2 flex-1">
 <ul className="divide-y divide-mono-border/50">
 <li>
 <button className="w-full text-left p-4 hover:bg-mono-surface/50 transition-colors flex items-center justify-between group">
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
 <li>
 <button className="w-full text-left p-4 hover:bg-mono-surface/50 transition-colors flex items-center justify-between group">
 <div className="flex items-start gap-4">
 <Bell size={20} className="text-mono-text mt-0.5 shrink-0" />
 <div>
 <h4 className="font-bold text-mono-text text-sm mb-0.5">Notification Preferences</h4>
 <p className="text-xs font-medium text-mono-muted">Manage how you receive notifications</p>
 </div>
 </div>
 <ChevronRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors" />
 </button>
 </li>
 <li>
 <button className="w-full text-left p-4 hover:bg-mono-surface/50 transition-colors flex items-center justify-between group">
 <div className="flex items-start gap-4">
 <Globe size={20} className="text-mono-text mt-0.5 shrink-0" />
 <div>
 <h4 className="font-bold text-mono-text text-sm mb-0.5">Language</h4>
 <p className="text-xs font-medium text-mono-muted">Choose your preferred language</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-mono-text">English</span>
 <ChevronRight size={18} className="text-mono-muted group-hover:text-mono-text transition-colors" />
 </div>
 </button>
 </li>
 </ul>
 </div>
 </div>

 {/* Linked Info & Delete Account Column */}
 <div className="space-y-6 flex flex-col">
 {/* Linked Information */}
 <div className="bg-mono-bg rounded-2xl border border-mono-border shadow-sm overflow-hidden flex-1">
 <div className="p-6 border-b border-mono-border flex items-center justify-between bg-mono-surface/30">
 <div className="flex items-center gap-3">
 <FileText size={20} className="text-mono-text" />
 <h3 className="font-bold text-mono-text text-base">Linked Information</h3>
 </div>
 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors bg-mono-bg">
 <Edit2 size={12} /> Edit
 </button>
 </div>
 <div className="p-2">
 <table className="w-full text-sm">
 <tbody className="divide-y divide-mono-border/50">
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted w-2/5">Aadhaar Number</td>
 <td className="py-4 pr-4 font-bold text-mono-text"><span className="text-mono-muted font-medium italic">Not provided</span></td>
 </tr>
 <tr className="hover:bg-mono-surface/30 transition-colors">
 <td className="py-4 pl-4 font-medium text-mono-muted">Mobile Number</td>
 <td className="py-4 pr-4 font-bold text-mono-text flex items-center justify-between gap-2">
 <span><span className="text-mono-muted font-medium italic">Not provided</span></span>
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
 );
}
