import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { 
  Layers, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Loader2, 
  RefreshCw, 
  X,
  IndianRupee,
  Calendar,
  FileCheck2
} from 'lucide-react';
import clsx from 'clsx';

export interface ServiceItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  service_type: 'A' | 'B' | 'C' | string;
  base_fee: number | string | null;
  retention_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TYPE_DESCRIPTIONS: Record<string, { label: string; color: string }> = {
  A: { label: 'Fully Digital • Online Processing', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  B: { label: 'Hybrid • Online & Verification', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  C: { label: 'In-Person • Physical Visit Required', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export function ServiceManagement() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add Service Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    code: '',
    description: '',
    service_type: 'A',
    base_fee: 50,
    retention_days: 365,
    is_active: true,
  });
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Edit Service Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    service_type: 'A',
    base_fee: 50,
    retention_days: 365,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Toggle status loading
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(null);

  const fetchServices = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ServiceItem[]>('/services/?active=false&limit=200');
      setServices(res.data);
    } catch {
      setError('Failed to fetch services catalogue. Please verify backend connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggleStatus = async (service: ServiceItem) => {
    setTogglingServiceId(service.id);
    setError(null);
    try {
      const newStatus = !service.is_active;
      const res = await api.patch<ServiceItem>(`/services/${service.id}`, {
        is_active: newStatus,
      });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: res.data.is_active } : s))
      );
      setSuccessMessage(`Service "${service.name}" is now ${newStatus ? 'Active' : 'Disabled'}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to update service status.');
    } finally {
      setTogglingServiceId(null);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError(null);

    if (!newService.name.trim() || !newService.code.trim()) {
      setAddModalError('Service Name and Service Code are required.');
      return;
    }

    setIsSubmittingService(true);
    try {
      const res = await api.post<ServiceItem>('/services/', {
        name: newService.name.trim(),
        code: newService.code.trim().toUpperCase(),
        description: newService.description.trim() || undefined,
        service_type: newService.service_type,
        base_fee: Number(newService.base_fee),
        retention_days: Number(newService.retention_days),
        is_active: true,
      });

      setServices((prev) => [res.data, ...prev]);
      setIsAddModalOpen(false);
      setNewService({
        name: '',
        code: '',
        description: '',
        service_type: 'A',
        base_fee: 50,
        retention_days: 365,
        is_active: true,
      });
      setSuccessMessage(`Service "${res.data.name}" successfully configured!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setAddModalError(e.response?.data?.detail || 'Failed to create service.');
    } finally {
      setIsSubmittingService(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setEditModalError(null);

    setIsSubmittingEdit(true);
    try {
      const res = await api.patch<ServiceItem>(`/services/${editingService.id}`, {
        name: editForm.name.trim() || undefined,
        description: editForm.description.trim() || undefined,
        service_type: editForm.service_type,
        base_fee: Number(editForm.base_fee),
        retention_days: Number(editForm.retention_days),
      });

      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? { ...s, ...res.data } : s))
      );
      setIsEditModalOpen(false);
      setEditingService(null);
      setSuccessMessage(`Service "${res.data.name}" details updated.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setEditModalError(e.response?.data?.detail || 'Failed to update service.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === 'ALL' || service.service_type === selectedType;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && service.is_active) ||
        (statusFilter === 'INACTIVE' && !service.is_active);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [services, searchTerm, selectedType, statusFilter]);

  const activeCount = useMemo(() => services.filter((s) => s.is_active).length, [services]);
  const avgFee = useMemo(() => {
    const valid = services.filter((s) => s.base_fee !== null && s.base_fee !== undefined && s.base_fee !== '');
    if (!valid.length) return 0;
    return Math.round(valid.reduce((acc, s) => acc + (Number(s.base_fee) || 0), 0) / valid.length);
  }, [services]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-mono-text rounded-[16px] flex items-center justify-center text-mono-bg">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-mono-text">Service Catalogue</h1>
            <p className="text-mono-muted text-sm mt-0.5">
              Government civic schemes, revenue certificates, fee structures, and document requirements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchServices(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-mono-border text-mono-text hover:bg-mono-surface transition-colors flex items-center gap-2 text-sm font-medium"
            title="Refresh Services"
          >
            <RefreshCw size={16} className={clsx(isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-mono-text text-mono-bg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            Add New Service
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
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Total Services</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">{services.length}</p>
          <p className="text-xs text-mono-muted mt-1">Configured in e-District</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Active Services</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{activeCount}</p>
          </div>
          <p className="text-xs text-mono-muted mt-1">Available for citizen requests</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Average Fee</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">₹{avgFee}</p>
          <p className="text-xs text-mono-muted mt-1">Standard government base charge</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-mono-border shadow-sm">
          <p className="text-xs font-semibold text-mono-muted uppercase tracking-wider">Service Modes</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-1">3 Modes</p>
          <p className="text-xs text-mono-muted mt-1">Fully Digital, Hybrid & Visit</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-mono-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mono-muted" />
          <input
            type="text"
            placeholder="Search services by title, code (e.g. INC_CERT), or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-mono-text text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20 focus:border-mono-text"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-mono-border bg-mono-surface text-mono-text text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mono-text/20"
          >
            <option value="ALL">All Delivery Modes</option>
            <option value="A">Fully Digital</option>
            <option value="B">Hybrid Service</option>
            <option value="C">In-Person Visit Required</option>
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

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-mono-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-mono-muted">
            <Loader2 className="animate-spin text-mono-text mb-3" size={36} />
            <p className="text-sm">Loading service catalogue...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-16 text-center text-mono-muted">
            <Layers size={40} className="mx-auto text-mono-muted/40 mb-3" />
            <p className="text-base font-semibold text-mono-text">No services found</p>
            <p className="text-xs text-mono-muted mt-1">
              {searchTerm || selectedType !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try broadening your search or filter options.'
                : 'Click "Add New Service" to configure the first service.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-mono-text">
              <thead className="bg-mono-surface border-b border-mono-border text-xs uppercase font-bold text-mono-muted tracking-wider">
                <tr>
                  <th className="px-6 py-4">Service Name & Code</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Base Fee</th>
                  <th className="px-6 py-4">Retention</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mono-border">
                {filteredServices.map((service) => {
                  const typeBadge = TYPE_DESCRIPTIONS[service.service_type] || {
                    label: `Type ${service.service_type}`,
                    color: 'bg-mono-surface text-mono-muted border-mono-border',
                  };

                  return (
                    <tr key={service.id} className="hover:bg-mono-surface/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-mono-surface border border-mono-border flex items-center justify-center font-mono font-bold text-mono-text shrink-0">
                            <FileCheck2 size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-mono-text">{service.name}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-mono-surface text-mono-muted text-xs font-mono font-semibold">
                              {service.code}
                            </span>
                            {service.description && (
                              <p className="text-xs text-mono-muted mt-1 line-clamp-1 max-w-md">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            'inline-block px-2.5 py-1 rounded-full text-xs font-semibold border',
                            typeBadge.color
                          )}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-mono-text">
                        <div className="flex items-center gap-1">
                          <IndianRupee size={14} className="text-mono-muted" />
                          <span>{service.base_fee !== null && service.base_fee !== undefined && service.base_fee !== '' ? Number(service.base_fee).toFixed(2) : '0.00'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-mono-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>{service.retention_days ? `${service.retention_days} days` : 'Permanent'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(service)}
                          disabled={togglingServiceId === service.id}
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs',
                            service.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
                            togglingServiceId === service.id && 'opacity-50 cursor-wait'
                          )}
                          title="Click to toggle active status"
                        >
                          {togglingServiceId === service.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : service.is_active ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          <span>{service.is_active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingService(service);
                            setEditForm({
                              name: service.name,
                              description: service.description || '',
                              service_type: service.service_type || 'A',
                              base_fee: service.base_fee !== null && service.base_fee !== undefined && service.base_fee !== '' ? Number(service.base_fee) : 50,
                              retention_days: service.retention_days ?? 365,
                            });
                            setEditModalError(null);
                            setIsEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mono-border text-mono-text hover:bg-mono-surface font-semibold text-xs transition-colors"
                        >
                          <Edit3 size={14} />
                          Edit Fee & Details
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

      {/* Modal: Add New Service */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <h3 className="text-lg font-bold text-mono-text">Add e-Governance Service</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-mono-muted hover:text-mono-text p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="p-6 space-y-4">
              {addModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{addModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Income Certificate"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Service Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INC_CERT"
                    value={newService.code}
                    onChange={(e) => setNewService({ ...newService, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Official service description, issuing authority, and validity..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Service Delivery Mode *
                  </label>
                  <select
                    value={newService.service_type}
                    onChange={(e) => setNewService({ ...newService, service_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  >
                    <option value="A">Fully Digital (Online Processing)</option>
                    <option value="B">Hybrid (Online & Verification)</option>
                    <option value="C">In-Person (Physical Visit Required)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Base Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={newService.base_fee}
                    onChange={(e) => setNewService({ ...newService, base_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Retention (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newService.retention_days}
                    onChange={(e) => setNewService({ ...newService, retention_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-mono-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-mono-border text-mono-text text-sm font-semibold hover:bg-mono-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingService}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isSubmittingService && <Loader2 size={16} className="animate-spin" />}
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Service Fee & Details */}
      {isEditModalOpen && editingService && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-mono-border shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-6 border-b border-mono-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-mono-text text-mono-bg flex items-center justify-center">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-mono-text">Edit Service Configuration</h3>
                  <p className="text-xs text-mono-muted font-mono">{editingService.code}</p>
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
              {editModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{editModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                  Service Delivery Mode *
                </label>
                <select
                  value={editForm.service_type}
                  onChange={(e) => setEditForm({ ...editForm, service_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                >
                  <option value="A">Type A: Fully Digital • Online Processing</option>
                  <option value="B">Type B: Hybrid • Online & Verification</option>
                  <option value="C">Type C: In-Person • Physical Visit Required</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Base Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={editForm.base_fee}
                    onChange={(e) => setEditForm({ ...editForm, base_fee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-mono-text mb-1 uppercase tracking-wider">
                    Retention Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.retention_days}
                    onChange={(e) => setEditForm({ ...editForm, retention_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-mono-border bg-mono-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mono-text/20"
                  />
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
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-mono-text text-mono-bg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isSubmittingEdit && <Loader2 size={16} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
