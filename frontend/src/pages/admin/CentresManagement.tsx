import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { 
  Building2, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  UserPlus, 
  Loader2, 
  RefreshCw,
  X,
  Shield,
  UserCheck
} from 'lucide-react';
import clsx from 'clsx';

export interface Centre {
  id: string;
  name: string;
  code: string;
  address_text: string;
  locality: string | null;
  district: string;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const KERALA_DISTRICTS = [
  'All Districts',
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Koovappally',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

export function CentresManagement() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Register Centre Modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newCentre, setNewCentre] = useState({
    name: '',
    code: '',
    district: 'Kottayam',
    locality: '',
    address_text: '',
    pincode: '',
  });
  const [isSubmittingCentre, setIsSubmittingCentre] = useState(false);
  const [centreModalError, setCentreModalError] = useState<string | null>(null);

  // Onboard Staff Modal state
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [selectedCentreForStaff, setSelectedCentreForStaff] = useState<Centre | null>(null);
  const [staffForm, setStaffForm] = useState({
    role: 'centre_employee' as 'centre_employee' | 'centre_administrator',
    full_name: '',
    email: '',
    password: '',
  });
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);

  // Toggle status loading per centre
  const [togglingCentreId, setTogglingCentreId] = useState<string | null>(null);

  const fetchCentres = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Centre[]>('/centres/?active=false&limit=200');
      setCentres(res.data);
    } catch {
      setError('Failed to fetch Akshaya centres directory. Please check network connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  const handleToggleStatus = async (centre: Centre) => {
    setTogglingCentreId(centre.id);
    setError(null);
    try {
      const newStatus = !centre.is_active;
      const res = await api.patch<Centre>(`/centres/${centre.id}`, {
        is_active: newStatus,
      });
      setCentres((prev) =>
        prev.map((c) => (c.id === centre.id ? { ...c, is_active: res.data.is_active } : c))
      );
      setSuccessMessage(
        `Centre "${centre.name}" is now ${newStatus ? 'Active' : 'Suspended'}.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to update centre status.');
    } finally {
      setTogglingCentreId(null);
    }
  };

  const handleCreateCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    setCentreModalError(null);

    if (!newCentre.name.trim() || !newCentre.code.trim() || !newCentre.address_text.trim()) {
      setCentreModalError('Please fill in Centre Name, Code, and Address.');
      return;
    }

    setIsSubmittingCentre(true);
    try {
      const res = await api.post<Centre>('/centres/', {
        name: newCentre.name.trim(),
        code: newCentre.code.trim().toUpperCase(),
        district: newCentre.district,
        locality: newCentre.locality.trim() || undefined,
        address_text: newCentre.address_text.trim(),
        pincode: newCentre.pincode.trim() || undefined,
        is_active: true,
      });

      setCentres((prev) => [res.data, ...prev]);
      setIsRegisterModalOpen(false);
      setNewCentre({
        name: '',
        code: '',
        district: 'Kottayam',
        locality: '',
        address_text: '',
        pincode: '',
      });
      setSuccessMessage(`Akshaya Centre "${res.data.name}" successfully registered!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setCentreModalError(e.response?.data?.detail || 'Failed to register new centre.');
    } finally {
      setIsSubmittingCentre(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCentreForStaff) return;
    setStaffModalError(null);

    if (!staffForm.full_name.trim() || !staffForm.email.trim() || !staffForm.password.trim()) {
      setStaffModalError('All fields are required.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const endpoint =
        staffForm.role === 'centre_administrator'
          ? `/staff/centres/${selectedCentreForStaff.id}/administrators`
          : `/staff/centres/${selectedCentreForStaff.id}/employees`;

      await api.post(endpoint, {
        full_name: staffForm.full_name.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
      });

      setIsOnboardModalOpen(false);
      setStaffForm({
        role: 'centre_employee',
        full_name: '',
        email: '',
        password: '',
      });
      setSuccessMessage(
        `New ${staffForm.role === 'centre_administrator' ? 'Administrator' : 'Operator'} onboarded for ${selectedCentreForStaff.name}.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setStaffModalError(e.response?.data?.detail || 'Failed to onboard staff member.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Filtered centres calculation
  const filteredCentres = useMemo(() => {
    return centres.filter((centre) => {
      const matchesSearch =
        centre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        centre.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (centre.locality && centre.locality.toLowerCase().includes(searchTerm.toLowerCase())) ||
        centre.address_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (centre.pincode && centre.pincode.includes(searchTerm));

      const matchesDistrict =
        selectedDistrict === 'All Districts' || centre.district === selectedDistrict;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && centre.is_active) ||
        (statusFilter === 'INACTIVE' && !centre.is_active);

      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [centres, searchTerm, selectedDistrict, statusFilter]);

  const activeCount = useMemo(() => centres.filter((c) => c.is_active).length, [centres]);
  const inactiveCount = centres.length - activeCount;
  const uniqueDistrictsCount = useMemo(
    () => new Set(centres.map((c) => c.district)).size,
    [centres]
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-mono-text rounded-[16px] flex items-center justify-center text-mono-bg">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-mono-text">Centres & Staff</h1>
            <p className="text-mono-muted text-sm mt-0.5">
              Akshaya e-Kendra network directory, active status control, and staff provisioning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCentres(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-mono-border text-mono-text hover:bg-mono-surface transition-colors flex items-center gap-2 text-sm font-medium"
            title="Refresh Centre List"
          >
            <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-mono-text text-mono-bg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            Register New Centre
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Total Centres</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{centres.length}</p>
          <p className="text-xs text-mono-muted mt-1">Enrolled across Kerala</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Active Centres</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{activeCount}</p>
          </div>
          <p className="text-xs text-mono-muted mt-1">Operational & taking requests</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Suspended / Inactive</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{inactiveCount}</p>
          <p className="text-xs text-mono-muted mt-1">Temporarily offline</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Districts Covered</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{uniqueDistrictsCount} / 14</p>
          <p className="text-xs text-mono-muted mt-1">Regional operational footprint</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-mono-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mono-muted" />
          <input
            type="text"
            placeholder="Search by centre name, code, locality, or PIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-mono-text text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20 focus:border-mono-text"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-mono-text text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mono-text/20"
          >
            {KERALA_DISTRICTS.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border border-mono-border p-1 bg-mono-surface">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                statusFilter === 'ALL'
                  ? 'bg-mono-text text-mono-bg shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                statusFilter === 'INACTIVE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Centres Table */}
      <div className="bg-white rounded-2xl border border-mono-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-mono-muted">
            <Loader2 className="animate-spin text-mono-text mb-3" size={36} />
            <p className="text-sm">Loading Akshaya centres...</p>
          </div>
        ) : filteredCentres.length === 0 ? (
          <div className="py-16 text-center text-mono-muted">
            <Building2 size={40} className="mx-auto text-mono-muted/40 mb-3" />
            <p className="text-base font-semibold text-mono-text">No centres found</p>
            <p className="text-xs text-mono-muted mt-1">
              {searchTerm || selectedDistrict !== 'All Districts' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter settings.'
                : 'Click "Register New Centre" to add your first Akshaya Centre.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-mono-text">
              <thead className="bg-mono-surface border-b border-mono-border text-xs uppercase font-bold text-mono-muted tracking-wider">
                <tr>
                  <th className="px-6 py-4">Centre Info</th>
                  <th className="px-6 py-4">District & Locality</th>
                  <th className="px-6 py-4">Address & PIN</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mono-border">
                {filteredCentres.map((centre) => (
                  <tr key={centre.id} className="hover:bg-mono-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-mono-surface border border-mono-border flex items-center justify-center font-bold text-mono-text shrink-0">
                          {centre.district.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-mono-text">{centre.name}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-mono-surface text-mono-muted text-xs font-mono font-medium">
                            {centre.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {centre.district}
                      </span>
                      {centre.locality && (
                        <p className="text-xs text-mono-muted mt-1 flex items-center gap-1">
                          <MapPin size={12} /> {centre.locality}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-xs text-mono-text max-w-xs line-clamp-2">{centre.address_text}</p>
                      {centre.pincode && (
                        <p className="text-xs font-mono text-mono-muted mt-0.5">PIN: {centre.pincode}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(centre)}
                        disabled={togglingCentreId === centre.id}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs',
                          centre.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
                          togglingCentreId === centre.id && 'opacity-50 cursor-wait'
                        )}
                        title="Click to toggle operational status"
                      >
                        {togglingCentreId === centre.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : centre.is_active ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <XCircle size={13} />
                        )}
                        <span>{centre.is_active ? 'Active' : 'Suspended'}</span>
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedCentreForStaff(centre);
                          setStaffModalError(null);
                          setIsOnboardModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-mono-text hover:bg-mono-surface font-semibold text-xs transition-colors"
                      >
                        <UserPlus size={14} />
                        Onboard Staff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Register New Centre */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <h3 className="text-lg font-bold text-mono-text">Register Akshaya Centre</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-mono-muted hover:text-mono-text p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCentre} className="p-6 space-y-4">
              {centreModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{centreModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Centre Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Koovappally Akshaya e-Kendra"
                    value={newCentre.name}
                    onChange={(e) => setNewCentre({ ...newCentre, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Centre Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KTM-AK-001"
                    value={newCentre.code}
                    onChange={(e) => setNewCentre({ ...newCentre, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    District *
                  </label>
                  <select
                    value={newCentre.district}
                    onChange={(e) => setNewCentre({ ...newCentre, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  >
                    {KERALA_DISTRICTS.filter((d) => d !== 'All Districts').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Locality / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kanjirappally"
                    value={newCentre.locality}
                    onChange={(e) => setNewCentre({ ...newCentre, locality: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Full Physical Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Door No, Building Name, Street, Post Office..."
                  value={newCentre.address_text}
                  onChange={(e) => setNewCentre({ ...newCentre, address_text: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Postal Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 686518"
                  value={newCentre.pincode}
                  onChange={(e) => setNewCentre({ ...newCentre, pincode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-mono-border">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-mono-border text-mono-text text-sm font-semibold hover:bg-mono-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCentre}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isSubmittingCentre && <Loader2 size={16} className="animate-spin" />}
                  Register Centre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Onboard Staff */}
      {isOnboardModalOpen && selectedCentreForStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-mono-text">Onboard Centre Personnel</h3>
                  <p className="text-xs text-mono-muted">{selectedCentreForStaff.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-mono-muted hover:text-mono-text p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {staffModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{staffModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Role Assignment *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, role: 'centre_employee' })}
                    className={clsx(
                      'p-2.5 rounded-xl border text-left text-xs font-medium transition-colors flex items-center gap-2',
                      staffForm.role === 'centre_employee'
                        ? 'border-mono-text bg-mono-surface font-bold text-mono-text'
                        : 'border-mono-border text-mono-muted hover:text-mono-text'
                    )}
                  >
                    <UserCheck size={16} />
                    <span>Centre Operator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffForm({ ...staffForm, role: 'centre_administrator' })}
                    className={clsx(
                      'p-2.5 rounded-xl border text-left text-xs font-medium transition-colors flex items-center gap-2',
                      staffForm.role === 'centre_administrator'
                        ? 'border-mono-text bg-mono-surface font-bold text-mono-text'
                        : 'border-mono-border text-mono-muted hover:text-mono-text'
                    )}
                  >
                    <Shield size={16} />
                    <span>Centre Admin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sreelakshmi Nair"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff.koovappally@akshaya.kerala.gov.in"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-mono-border">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-mono-border text-mono-text text-sm font-semibold hover:bg-mono-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isSubmittingStaff && <Loader2 size={16} className="animate-spin" />}
                  Confirm Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
