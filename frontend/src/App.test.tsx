import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as AuthContext from './contexts/AuthContext';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(),
}));

vi.mock('./pages/citizen/Dashboard', () => ({
  Dashboard: () => <div>Mock Citizen Dashboard</div>,
}));

vi.mock('./pages/employee/EmployeeDashboard', () => ({
  EmployeeDashboard: () => <div>Mock Employee Dashboard</div>,
}));

vi.mock('./pages/admin/SysAdminDashboard', () => ({
  SysAdminDashboard: () => <div>Mock SysAdmin Dashboard</div>,
}));

vi.mock('./pages/admin/CentreAdminDashboard', () => ({
  CentreAdminDashboard: () => <div>Mock Centre Admin Dashboard</div>,
}));

vi.mock('./pages/admin/CentreEmployees', () => ({
  CentreEmployees: () => <div>Mock Centre Employees</div>,
}));

vi.mock('./pages/admin/CentreQueue', () => ({
  CentreQueue: () => <div>Mock Centre Queue</div>,
}));

vi.mock('./pages/admin/Escalations', () => ({
  Escalations: () => <div>Mock Escalations</div>,
}));

vi.mock('./pages/admin/CentresManagement', () => ({
  CentresManagement: () => <div>Mock Centres Management</div>,
}));

vi.mock('./pages/admin/ServiceManagement', () => ({
  ServiceManagement: () => <div>Mock Service Management</div>,
}));

vi.mock('./pages/admin/SupportAdmin', () => ({
  SupportAdmin: () => <div>Mock Support Admin</div>,
}));

vi.mock('./pages/admin/AuditLogs', () => ({
  AuditLogs: () => <div>Mock Audit Logs</div>,
}));

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('unauthenticated users at root see LandingPage', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    render(<App />);
    expect(screen.getAllByText('SAHAYA').length).toBeGreaterThan(0);
  });

  it('unauthenticated users navigating to protected route go to /login', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.getAllByRole('heading', { name: 'Sign in' }).length).toBeGreaterThan(0);
  });

  it('Citizen root route -> /dashboard', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'c@test.com', role: 'citizen', full_name: 'Citizen' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Mock Citizen Dashboard')).toBeInTheDocument();
  });

  it('Approved Employee root route -> /queue', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'e@test.com',
        role: 'centre_employee',
        full_name: 'Employee',
        approval_status: 'APPROVED',
      },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Mock Employee Dashboard')).toBeInTheDocument();
  });

  it('Pending Employee is blocked and renders PendingApproval screen', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'e@test.com',
        role: 'centre_employee',
        full_name: 'Pending Employee',
        approval_status: 'PENDING_APPROVAL',
      },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/queue');
    render(<App />);
    expect(screen.getByText('Registration Pending Approval')).toBeInTheDocument();
    expect(screen.queryByText('Mock Queue')).not.toBeInTheDocument();
  });

  it('Citizen cannot render /queue', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'c@test.com', role: 'citizen', full_name: 'Citizen' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/queue');
    render(<App />);
    expect(screen.getByText('Mock Citizen Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Mock Queue')).not.toBeInTheDocument();
  });

  it('Employee cannot render Citizen dashboard', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'e@test.com',
        role: 'centre_employee',
        full_name: 'Employee',
        approval_status: 'APPROVED',
      },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.queryByText('Mock Citizen Dashboard')).not.toBeInTheDocument();
  });

  it('SysAdmin root route -> /sysadmin/dashboard', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@akshaya.kerala.gov.in', role: 'system_administrator', full_name: 'Sys Admin' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Mock SysAdmin Dashboard')).toBeInTheDocument();
  });

  it('SysAdmin sidebar contains all 5 admin navigation destinations', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@akshaya.kerala.gov.in', role: 'system_administrator', full_name: 'Sys Admin' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/sysadmin/dashboard');
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Centres & Staff')).toBeInTheDocument();
    expect(screen.getByText('Service Catalogue')).toBeInTheDocument();
    expect(screen.getByText('Support Tickets')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
  });

  it('SysAdmin routes navigate to Centres, Services, Support, and Audit without blank page', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@akshaya.kerala.gov.in', role: 'system_administrator', full_name: 'Sys Admin' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/sysadmin/centres');
    const { unmount } = render(<App />);
    expect(screen.getByText('Mock Centres Management')).toBeInTheDocument();
    unmount();

    window.history.pushState({}, '', '/sysadmin/services');
    const res2 = render(<App />);
    expect(screen.getByText('Mock Service Management')).toBeInTheDocument();
    res2.unmount();

    window.history.pushState({}, '', '/sysadmin/support');
    const res3 = render(<App />);
    expect(screen.getByText('Mock Support Admin')).toBeInTheDocument();
    res3.unmount();

    window.history.pushState({}, '', '/sysadmin/audit');
    const res4 = render(<App />);
    expect(screen.getByText('Mock Audit Logs')).toBeInTheDocument();
    res4.unmount();
  });

  it('Centre Administrator root route -> /admin/dashboard', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: 'admin-2',
        email: 'manager@akshaya.kerala.gov.in',
        role: 'centre_administrator',
        full_name: 'Centre Manager',
        centre_id: 'c-1',
      },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Mock Centre Admin Dashboard')).toBeInTheDocument();
  });

  it('Centre Administrator sidebar contains all 5 manager navigation destinations', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: 'admin-2',
        email: 'manager@akshaya.kerala.gov.in',
        role: 'centre_administrator',
        full_name: 'Centre Manager',
        centre_id: 'c-1',
      },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/admin/dashboard');
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Work Queue')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Escalations')).toBeInTheDocument();
    expect(screen.getByText('Support Tickets')).toBeInTheDocument();
  });

  it('Centre Administrator routes navigate to Queue, Employees, Escalations, and Support without blank page', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: {
        id: 'admin-2',
        email: 'manager@akshaya.kerala.gov.in',
        role: 'centre_administrator',
        full_name: 'Centre Manager',
        centre_id: 'c-1',
      },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isLoading: false,
    });

    window.history.pushState({}, '', '/admin/queue');
    const { unmount } = render(<App />);
    expect(screen.getByText('Mock Centre Queue')).toBeInTheDocument();
    unmount();

    window.history.pushState({}, '', '/admin/employees');
    const res2 = render(<App />);
    expect(screen.getByText('Mock Centre Employees')).toBeInTheDocument();
    res2.unmount();

    window.history.pushState({}, '', '/admin/escalations');
    const res3 = render(<App />);
    expect(screen.getByText('Mock Escalations')).toBeInTheDocument();
    res3.unmount();

    window.history.pushState({}, '', '/admin/support');
    const res4 = render(<App />);
    expect(screen.getByText('Mock Support Admin')).toBeInTheDocument();
    res4.unmount();
  });
});
