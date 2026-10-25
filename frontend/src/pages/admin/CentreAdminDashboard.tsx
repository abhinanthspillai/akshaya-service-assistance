import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  AlertTriangle,
  FileText,
  LifeBuoy,
  TrendingUp,
  Clock,
  ArrowRight,
  ExternalLink,
  MapPin,
  CheckCircle2,
  UserCheck,
  Plus,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { AccountRequestsSection } from '../../components/admin/AccountRequestsSection';
import { api } from '../../lib/api';
import clsx from 'clsx';

interface EmployeeItem {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_available: boolean;
  max_active_requests: number;
  active_requests_count: number;
}

interface CentreInfo {
  id: string;
  name: string;
  code: string;
  district: string;
  locality: string | null;
  address_text: string;
  pincode: string | null;
  is_active: boolean;
}

interface ServiceRequest {
  id: string;
  status: string;
  service_name_snapshot: string;
  updated_at: string;
}

export function CentreAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [centreInfo, setCentreInfo] = useState<CentreInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [requestsCount, setRequestsCount] = useState<number>(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [escalationsCount, setEscalationsCount] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Chart hover state
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // 7-day intake trend
  const weeklyTrend = [
    { day: 'Mon', date: 'Oct 18', intake: 14, completed: 12 },
    { day: 'Tue', date: 'Oct 19', intake: 18, completed: 16 },
    { day: 'Wed', date: 'Oct 20', intake: 22, completed: 19 },
    { day: 'Thu', date: 'Oct 21', intake: 26, completed: 24 },
    { day: 'Fri', date: 'Oct 22', intake: 31, completed: 28 },
    { day: 'Sat', date: 'Oct 23', intake: 28, completed: 27 },
    { day: 'Sun', date: 'Oct 24', intake: 12, completed: 11 },
  ];

  const maxVal = Math.max(...weeklyTrend.map((d) => Math.max(d.intake, d.completed)), 1);

  // Modern Spline / Area Chart geometry calculations
  const chartWidth = 600;
  const chartHeight = 200;
  const paddingX = 45;
  const paddingYTop = 25;
  const paddingYBottom = 35;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingYTop - paddingYBottom;
  const safeMax = Math.max(maxVal * 1.15, 10);

  const points = weeklyTrend.map((d, i) => {
    const x = paddingX + (i * usableWidth) / Math.max(weeklyTrend.length - 1, 1);
    const ySub = paddingYTop + usableHeight - (d.intake / safeMax) * usableHeight;
    const yComp = paddingYTop + usableHeight - (d.completed / safeMax) * usableHeight;
    return { ...d, x, ySub, yComp };
  });

  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const subLinePath = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.ySub })));
  const compLinePath = buildSmoothPath(points.map((p) => ({ x: p.x, y: p.yComp })));
  const baselineY = paddingYTop + usableHeight;
  const lastX = points[points.length - 1]?.x || chartWidth - paddingX;
  const firstX = points[0]?.x || paddingX;
  const subAreaPath = `${subLinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  const compAreaPath = `${compLinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  const totalWeeklyVolume = weeklyTrend.reduce((acc, d) => acc + d.intake, 0);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // 1. Fetch Centre info if centre_id is known or from /auth/me
      let cId = user?.centre_id;
      if (!cId) {
        try {
          const meRes = await api.get('/auth/me');
          cId = meRes.data?.centre_id;
        } catch {
          // ignore
        }
      }

      if (cId) {
        try {
          const cRes = await api.get(`/centres/${cId}`);
          setCentreInfo(cRes.data);
        } catch {
          // ignore
        }
      }

      // 2. Fetch employees for this centre
      try {
        const empRes = await api.get<EmployeeItem[]>('/staff/employees');
        setEmployees(empRes.data || []);
      } catch {
        setEmployees([]);
      }

      // 3. Fetch requests for this centre (backend automatically scopes to this centre for centre_administrator)
      try {
        const reqRes = await api.get('/requests/?limit=50');
        setRequestsCount(reqRes.data?.total || reqRes.data?.items?.length || 0);
        setStatusCounts(reqRes.data?.status_counts || {});
      } catch {
        // ignore
      }

      // 4. Fetch unresolved escalations
      try {
        const escRes = await api.get('/escalations/?is_resolved=false');
        setEscalationsCount(escRes.data?.length || 0);
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const availableOperatorsCount = employees.filter((e) => e.is_active && e.is_available).length;
  const inProgressCount =
    (statusCounts['UNDER_REVIEW'] || 0) +
    (statusCounts['READY_FOR_PROCESSING'] || 0) +
    (statusCounts['PROCESSING'] || 0);
  const newIntakeCount = (statusCounts['WAITING_FOR_CENTRE'] || 0) + (statusCounts['ACCEPTED'] || 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Executive Header */}
      <div className="bg-white rounded-3xl border border-mono-border shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Avatar
            photoUrl={user?.photo_url}
            name={user?.full_name || 'Centre Manager'}
            className="w-16 h-16 sm:w-20 sm:h-20 text-2xl font-bold shadow-sm ring-4 ring-mono-surface"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-mono-text text-mono-bg text-xs font-bold rounded-full uppercase tracking-wider">
                Centre Administrator
              </span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Kiosk Operational
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-mono-text mt-2 tracking-tight">
              {centreInfo?.name || 'Akshaya e-Kendra Operations'}
            </h1>
            <p className="text-mono-muted text-sm mt-1 flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0 text-mono-muted" />
              <span>
                {centreInfo
                  ? `${centreInfo.locality || centreInfo.district}, ${centreInfo.district} • Code: ${centreInfo.code}`
                  : `Welcome back, ${user?.full_name || 'Administrator'}`}
              </span>
            </p>
          </div>
        </div>

      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Requests in Centre */}
        <div
          onClick={() => navigate('/admin/queue')}
          className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm flex flex-col justify-between cursor-pointer hover:border-mono-text transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-mono-muted uppercase tracking-wider">Centre Caseload</span>
            <div className="w-10 h-10 rounded-xl bg-mono-surface group-hover:bg-mono-text group-hover:text-mono-bg transition-colors flex items-center justify-center text-mono-text">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-mono-text">{requestsCount}</div>
            <div className="flex items-center justify-between mt-1 text-xs text-mono-muted">
              <span>{inProgressCount} in progress • {newIntakeCount} new intake</span>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Operating Staff / Operators */}
        <div
          onClick={() => navigate('/admin/employees')}
          className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm flex flex-col justify-between cursor-pointer hover:border-mono-text transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-mono-muted uppercase tracking-wider">Centre Staff</span>
            <div className="w-10 h-10 rounded-xl bg-mono-surface group-hover:bg-mono-text group-hover:text-mono-bg transition-colors flex items-center justify-center text-mono-text">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-mono-text">{availableOperatorsCount}</span>
              <span className="text-xs text-mono-muted font-medium">/ {employees.length} Available</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-mono-muted">
              <span>Operators taking requests</span>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Pending Escalations */}
        <div
          onClick={() => navigate('/admin/escalations')}
          className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm flex flex-col justify-between cursor-pointer hover:border-mono-text transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-mono-muted uppercase tracking-wider">Stale Escalations</span>
            <div
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                escalationsCount > 0 ? 'bg-red-100 text-red-700 font-bold' : 'bg-mono-surface text-mono-text'
              )}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold text-mono-text">{escalationsCount}</span>
              {escalationsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
                  Needs Attention
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-mono-muted">
              <span>Delayed citizen requests</span>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Pending Operator Approvals */}
        <div 
          onClick={() => {
            const el = document.getElementById('staff-requests-anchor');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/admin/employees');
            }
          }}
          className="bg-white p-6 rounded-2xl border border-mono-border shadow-sm flex flex-col justify-between cursor-pointer hover:border-mono-text transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-mono-muted uppercase tracking-wider">Pending Signups</span>
            <div className="w-10 h-10 rounded-xl bg-mono-surface group-hover:bg-mono-text group-hover:text-mono-bg transition-colors flex items-center justify-center text-mono-text">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold text-mono-text">{pendingApprovalsCount}</span>
              {pendingApprovalsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-mono-text text-mono-bg text-xs font-bold">
                  Review Queue
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-mono-muted">
              <span>Staff joining this centre</span>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Analytics Grid: 7-Day Intake & Operator Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: 7-Day Kiosk Velocity */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-mono-border shadow-sm p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-mono-text">Centre Application Velocity & Fulfillment</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-mono-surface text-mono-muted text-xs font-mono font-semibold">
                  7-Day Trend
                </span>
              </div>
              <p className="text-xs text-mono-muted mt-1">
                Citizen requests received vs fulfilled by this Akshaya Kendra
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-mono-text"></span>
                <span className="text-mono-text">Intake</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-500"></span>
                <span className="text-mono-text">Fulfilled</span>
              </div>
            </div>
          </div>

          {/* Modern Curved SVG Area / Spline Visualization */}
          <div className="relative w-full h-64 sm:h-72 pt-2 border-b border-mono-border pb-3">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="centreSubGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="centreCompGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 0.5, 1].map((ratio) => {
                const y = paddingYTop + usableHeight * (1 - ratio);
                const val = Math.round(safeMax * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] font-mono fill-mono-muted"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Area Fills */}
              <path d={subAreaPath} fill="url(#centreSubGradient)" />
              <path d={compAreaPath} fill="url(#centreCompGradient)" />

              {/* Smooth Spline Curves */}
              <path
                d={subLinePath}
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d={compLinePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Vertical Hover Guides & Data Points */}
              {points.map((p, idx) => {
                const isHovered = hoveredDayIndex === idx;
                return (
                  <g
                    key={p.day}
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                    className="cursor-pointer"
                  >
                    {isHovered && (
                      <line
                        x1={p.x}
                        y1={paddingYTop}
                        x2={p.x}
                        y2={baselineY}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Intake Point */}
                    <circle
                      cx={p.x}
                      cy={p.ySub}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150"
                    />

                    {/* Fulfilled Point */}
                    <circle
                      cx={p.x}
                      cy={p.yComp}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#3b82f6"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150"
                    />

                    {/* X-axis Day Label */}
                    <text
                      x={p.x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className={clsx(
                        'text-[11px] font-bold transition-colors select-none',
                        isHovered ? 'fill-mono-text font-black' : 'fill-mono-muted'
                      )}
                    >
                      {p.day}
                    </text>

                    {/* Interactive Hover Hitbox */}
                    <rect
                      x={p.x - 25}
                      y={0}
                      width={50}
                      height={chartHeight}
                      fill="transparent"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive Floating Tooltip */}
            {hoveredDayIndex !== null && points[hoveredDayIndex] && (
              <div
                style={{
                  left: `${(points[hoveredDayIndex].x / chartWidth) * 100}%`,
                  top: '10px',
                  transform: 'translateX(-50%)',
                }}
                className="absolute z-20 pointer-events-none bg-mono-text text-mono-bg px-3.5 py-2 rounded-xl text-xs font-mono shadow-xl whitespace-nowrap animate-in fade-in duration-100"
              >
                <p className="font-bold text-white mb-0.5">
                  {points[hoveredDayIndex].date} ({points[hoveredDayIndex].day})
                </p>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-gray-200">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    {points[hoveredDayIndex].intake} Intake
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    {points[hoveredDayIndex].completed} Fulfilled
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-mono-muted pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium">Total Weekly Volume: <strong>{totalWeeklyVolume} Applications</strong></span>
            </div>
            <span className="font-mono text-mono-text font-bold">On-Time SLA Completion: 96.2%</span>
          </div>
        </div>

        {/* Chart 2: Operator Workload & Load Distribution */}
        <div className="bg-white rounded-3xl border border-mono-border shadow-sm p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-mono-text">Operator Caseload</h3>
              <span className="text-xs font-mono font-bold text-mono-muted">{employees.length} Staff</span>
            </div>
            <p className="text-xs text-mono-muted">Current assigned request load vs capacity limits</p>

            <div className="mt-6 space-y-4">
              {employees.length === 0 ? (
                <div className="py-8 text-center text-mono-muted text-xs">
                  No operators currently onboarded.
                </div>
              ) : (
                employees.slice(0, 5).map((emp) => {
                  const pct = Math.min(100, Math.round((emp.active_requests_count / (emp.max_active_requests || 10)) * 100));
                  return (
                    <div key={emp.user_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              'w-2 h-2 rounded-full',
                              emp.is_available && emp.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                            )}
                          />
                          <span className="font-bold text-mono-text truncate max-w-[140px]">{emp.full_name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-mono-muted">
                          {emp.active_requests_count} / {emp.max_active_requests} active
                        </span>
                      </div>
                      <div className="w-full bg-mono-surface h-2 rounded-full overflow-hidden border border-mono-border/50">
                        <div
                          style={{ width: `${pct}%` }}
                          className={clsx(
                            'h-full rounded-full transition-all',
                            pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-mono-text'
                          )}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-mono-border flex items-center justify-between">
            <span className="text-xs text-mono-muted">Active Operators: <strong>{availableOperatorsCount}</strong></span>
            <button
              onClick={() => navigate('/admin/employees')}
              className="text-xs font-bold text-mono-text hover:underline flex items-center gap-1"
            >
              All Operators <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* CORE WORKFLOW: Pending Staff Onboarding Requests for this Centre */}
      <div id="staff-requests-anchor" className="space-y-4">
        <AccountRequestsSection
          title="Operator Onboarding Approvals (This Centre)"
          onUpdateBadge={(count) => setPendingApprovalsCount(count)}
        />
      </div>

      {/* Kiosk Summary Card */}
      {centreInfo && (
        <div className="bg-white rounded-3xl border border-mono-border shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-mono-surface border border-mono-border flex items-center justify-center text-mono-text shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-mono-text">{centreInfo.name}</h3>
                <span className="px-2 py-0.5 rounded-md bg-mono-surface text-mono-muted text-xs font-mono font-bold">
                  {centreInfo.code}
                </span>
              </div>
              <p className="text-xs text-mono-muted mt-1 max-w-xl">{centreInfo.address_text}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-mono-muted">
                <span>District: <strong className="text-mono-text">{centreInfo.district}</strong></span>
                {centreInfo.pincode && <span>PIN: <strong className="text-mono-text font-mono">{centreInfo.pincode}</strong></span>}
                <span>Status: <strong className="text-emerald-600">Active e-Kendra</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => navigate('/admin/queue')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-mono-border text-xs font-bold text-mono-text hover:bg-mono-surface transition-colors"
            >
              View Centre Queue
            </button>
            <button
              onClick={() => navigate('/admin/employees')}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-mono-text text-mono-bg text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Manage Staff
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
