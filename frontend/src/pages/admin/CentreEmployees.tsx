import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Loader2,
  RefreshCw,
  X,
  Sliders,
  Mail,
  Shield,
  Briefcase
} from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import clsx from 'clsx';

export interface CentreEmployee {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  centre_id: string;
  is_active: boolean;
  is_available: boolean;
  max_active_requests: number;
  approval_status: string;
  created_at: string;
  active_requests_count: number;
}

export function CentreEmployees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<CentreEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'OFFLINE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modals
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Edit Capacity Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<CentreEmployee | null>(null);
  const [editForm, setEditForm] = useState({
    max_active_requests: 10,
    is_available: true,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Quick Action Pending User ID
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const fetchEmployees = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // Calling /staff/employees scopes to the manager's centre
      const res = await api.get<CentreEmployee[]>('/staff/employees');
      setEmployees(res.data || []);
    } catch {
      setError('Failed to fetch centre staff directory.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Toggle user system status (Active <-> Suspended)
  const handleToggleStatus = async (emp: CentreEmployee) => {
    setProcessingUserId(emp.user_id);
    setError(null);
    try {
      const newStatus = !emp.is_active;
      await api.patch(`/staff/users/${emp.user_id}/status`, {
        is_active: newStatus,
      });
      setEmployees((prev) =>
        prev.map((e) => (e.user_id === emp.user_id ? { ...e, is_active: newStatus } : e))
      );
      setSuccessMessage(
        `Staff account "${emp.full_name}" is now ${newStatus ? 'Active' : 'Suspended'}.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to update account status.');
    } finally {
      setProcessingUserId(null);
    }
  };

  // Toggle kiosk intake availability (Available <-> Offline)
  const handleToggleAvailability = async (emp: CentreEmployee) => {
    setProcessingUserId(emp.user_id);
    setError(null);
    try {
      const newAvail = !emp.is_available;
      const res = await api.patch<CentreEmployee>(
        `/staff/centres/${emp.centre_id}/employees/${emp.user_id}`,
        { is_available: newAvail }
      );
      setEmployees((prev) =>
        prev.map((e) => (e.user_id === emp.user_id ? { ...e, is_available: res.data.is_available } : e))
      );
      setSuccessMessage(
        `Operator "${emp.full_name}" is now ${newAvail ? 'Available for Intake' : 'Marked Offline'}.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to update availability.');
    } finally {
      setProcessingUserId(null);
    }
  };

  // Submit Onboard Operator
  const handleOnboardOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);

    let centreId = user?.centre_id;
    if (!centreId && employees.length > 0) {
      centreId = employees[0].centre_id;
    }
    if (!centreId) {
      try {
        const meRes = await api.get('/auth/me');
        centreId = meRes.data?.centre_id;
      } catch {
        // ignore
      }
    }

    if (!centreId) {
      setOnboardError('Unable to identify centre. Please refresh or contact state administrator.');
      return;
    }

    if (!newStaff.full_name.trim() || !newStaff.email.trim() || !newStaff.password.trim()) {
      setOnboardError('All fields are required.');
      return;
    }

    setIsOnboarding(true);
    try {
      await api.post(`/staff/centres/${centreId}/employees`, {
        full_name: newStaff.full_name.trim(),
        email: newStaff.email.trim(),
        password: newStaff.password,
      });

      setIsOnboardModalOpen(false);
      setNewStaff({ full_name: '', email: '', password: '' });
      setSuccessMessage('New operator successfully onboarded into this centre!');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchEmployees(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setOnboardError(e.response?.data?.detail || 'Failed to onboard operator.');
    } finally {
      setIsOnboarding(false);
    }
  };

  // Submit Edit Capacity
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setEditError(null);

    setIsSavingEdit(true);
    try {
      const res = await api.patch<CentreEmployee>(
        `/staff/centres/${selectedEmp.centre_id}/employees/${selectedEmp.user_id}`,
        {
          max_active_requests: Number(editForm.max_active_requests),
          is_available: editForm.is_available,
        }
      );

      setEmployees((prev) =>
        prev.map((e) =>
          e.user_id === selectedEmp.user_id
            ? {
                ...e,
                max_active_requests: res.data.max_active_requests,
                is_available: res.data.is_available,
              }
            : e
        )
      );

      setIsEditModalOpen(false);
      setSelectedEmp(null);
      setSuccessMessage(`Updated processing capacity for ${res.data.full_name}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setEditError(e.response?.data?.detail || 'Failed to update operator capacity.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAvail =
        availabilityFilter === 'ALL' ||
        (availabilityFilter === 'AVAILABLE' && emp.is_available) ||
        (availabilityFilter === 'OFFLINE' && !emp.is_available);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && emp.is_active) ||
        (statusFilter === 'SUSPENDED' && !emp.is_active);

      return matchesSearch && matchesAvail && matchesStatus;
    });
  }, [employees, searchTerm, availabilityFilter, statusFilter]);

  const availableCount = useMemo(
    () => employees.filter((e) => e.is_active && e.is_available).length,
    [employees]
  );
  const totalCaseload = useMemo(
    () => employees.reduce((acc, e) => acc + (e.active_requests_count || 0), 0),
    [employees]
  );
  const totalBandwidth = useMemo(
    () => employees.reduce((acc, e) => acc + (e.max_active_requests || 10), 0),
    [employees]
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-mono-text rounded-[16px] flex items-center justify-center text-mono-bg">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-mono-text">Centre Personnel & Operators</h1>
            <p className="text-mono-muted text-sm mt-0.5">
              Manage operator availability, active caseload capacity, and onboard new operators for this centre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEmployees(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-mono-border text-mono-text hover:bg-mono-surface transition-colors flex items-center gap-2 text-sm font-medium"
            title="Refresh Staff List"
          >
            <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-mono-text text-mono-bg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            Onboard Operator
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
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{employees.length}</p>
          <p className="text-xs text-mono-muted mt-1">Onboarded in this kiosk</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Available for Intake</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{availableCount}</p>
          </div>
          <p className="text-xs text-mono-muted mt-1">Taking citizen requests</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Active Caseload</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{totalCaseload}</p>
          <p className="text-xs text-mono-muted mt-1">Assigned requests processing</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Total Bandwidth</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{totalBandwidth}</p>
          <p className="text-xs text-mono-muted mt-1">Max concurrent capacity</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-mono-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mono-muted" />
          <input
            type="text"
            placeholder="Search by operator name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-mono-text text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20 focus:border-mono-text"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <div className="inline-flex rounded-xl border border-mono-border p-1 bg-mono-surface">
            <button
              onClick={() => setAvailabilityFilter('ALL')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                availabilityFilter === 'ALL'
                  ? 'bg-mono-text text-mono-bg shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              All Availability
            </button>
            <button
              onClick={() => setAvailabilityFilter('AVAILABLE')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                availabilityFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              Available
            </button>
            <button
              onClick={() => setAvailabilityFilter('OFFLINE')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                availabilityFilter === 'OFFLINE'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              Offline
            </button>
          </div>

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
              All Status
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
              onClick={() => setStatusFilter('SUSPENDED')}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                statusFilter === 'SUSPENDED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-mono-muted hover:text-mono-text'
              )}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-mono-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-mono-muted">
            <Loader2 className="animate-spin text-mono-text mb-3" size={36} />
            <p className="text-sm">Loading centre operators...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-mono-muted">
            <Users size={40} className="mx-auto text-mono-muted/40 mb-3" />
            <p className="text-base font-semibold text-mono-text">No staff found</p>
            <p className="text-xs text-mono-muted mt-1">
              {searchTerm || availabilityFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter pills.'
                : 'Click "Onboard Operator" to register your first staff member.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-mono-text">
              <thead className="bg-mono-surface border-b border-mono-border text-xs uppercase font-bold text-mono-muted tracking-wider">
                <tr>
                  <th className="px-6 py-4">Operator Profile</th>
                  <th className="px-6 py-4 text-center">Account Status</th>
                  <th className="px-6 py-4 text-center">Kiosk Availability</th>
                  <th className="px-6 py-4">Workload / Capacity</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mono-border">
                {filteredEmployees.map((emp) => {
                  const pct = Math.min(
                    100,
                    Math.round((emp.active_requests_count / (emp.max_active_requests || 10)) * 100)
                  );
                  const isBusy = emp.active_requests_count >= emp.max_active_requests;

                  return (
                    <tr key={emp.user_id} className="hover:bg-mono-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.full_name} className="w-10 h-10 text-sm shrink-0" />
                          <div>
                            <p className="font-bold text-mono-text">{emp.full_name}</p>
                            <p className="text-xs text-mono-muted flex items-center gap-1 mt-0.5">
                              <Mail size={12} /> {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* System Status (Active / Suspended) */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          disabled={processingUserId === emp.user_id}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs',
                            emp.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
                            processingUserId === emp.user_id && 'opacity-50 cursor-wait'
                          )}
                          title="Click to toggle user account status"
                        >
                          {processingUserId === emp.user_id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : emp.is_active ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          <span>{emp.is_active ? 'Active' : 'Suspended'}</span>
                        </button>
                      </td>

                      {/* Kiosk Intake Availability */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleAvailability(emp)}
                          disabled={processingUserId === emp.user_id}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs',
                            emp.is_available
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
                            processingUserId === emp.user_id && 'opacity-50 cursor-wait'
                          )}
                          title="Click to toggle intake readiness"
                        >
                          <span
                            className={clsx(
                              'w-2 h-2 rounded-full',
                              emp.is_available ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'
                            )}
                          />
                          <span>{emp.is_available ? 'Available' : 'Offline'}</span>
                        </button>
                      </td>

                      {/* Workload / Capacity */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[140px] max-w-[200px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-mono-text">
                              {emp.active_requests_count} / {emp.max_active_requests}
                            </span>
                            <span className="text-[11px] text-mono-muted">
                              {isBusy ? 'At Limit' : `${pct}% load`}
                            </span>
                          </div>
                          <div className="w-full bg-mono-surface h-2 rounded-full overflow-hidden border border-mono-border">
                            <div
                              style={{ width: `${pct}%` }}
                              className={clsx(
                                'h-full rounded-full transition-all',
                                pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                              )}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setEditForm({
                              max_active_requests: emp.max_active_requests || 10,
                              is_available: emp.is_available,
                            });
                            setEditError(null);
                            setIsEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-mono-text hover:bg-mono-surface font-semibold text-xs transition-colors"
                        >
                          <Sliders size={14} />
                          Adjust Limit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Onboard New Operator */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <h3 className="text-lg font-bold text-mono-text">Onboard Centre Operator</h3>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-mono-muted hover:text-mono-text p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleOnboardOperator} className="p-6 space-y-4">
              {onboardError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{onboardError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anandhu Krishnan"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
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
                  placeholder="e.g. anandhu.k@akshaya.kerala.gov.in"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
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
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
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
                  disabled={isOnboarding}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isOnboarding && <Loader2 size={16} className="animate-spin" />}
                  Onboard Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Limit & Capacity */}
      {isEditModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-mono-text">Adjust Operator Bandwidth</h3>
                  <p className="text-xs text-mono-muted">{selectedEmp.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-mono-muted hover:text-mono-text p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Max Concurrent Active Requests (1 - 50)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={editForm.max_active_requests}
                  onChange={(e) => setEditForm({ ...editForm, max_active_requests: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
                <p className="text-[11px] text-mono-muted mt-1">
                  Once this operator reaches this threshold, the queue will not auto-assign new requests to them.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Kiosk Intake Readiness
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_available: true })}
                    className={clsx(
                      'p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors',
                      editForm.is_available
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-mono-border text-mono-muted hover:text-mono-text'
                    )}
                  >
                    <CheckCircle2 size={15} />
                    Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_available: false })}
                    className={clsx(
                      'p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors',
                      !editForm.is_available
                        ? 'border-gray-500 bg-gray-100 text-gray-800'
                        : 'border-mono-border text-mono-muted hover:text-mono-text'
                    )}
                  >
                    <XCircle size={15} />
                    Offline / On Leave
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-mono-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-mono-border text-mono-text text-sm font-semibold hover:bg-mono-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isSavingEdit && <Loader2 size={16} className="animate-spin" />}
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
