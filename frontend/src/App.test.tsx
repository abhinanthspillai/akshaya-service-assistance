import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as AuthContext from './contexts/AuthContext';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(),
}));

vi.mock('./pages/citizen/Dashboard', () => ({
  Dashboard: () => <div>Mock Citizen Dashboard</div>
}));

vi.mock('./pages/employee/Queue', () => ({
  Queue: () => <div>Mock Queue</div>
}));

describe('App Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('unauthenticated users go to /login', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
    
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('Citizen root route -> /dashboard', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'c@test.com', role: 'citizen', full_name: 'Citizen' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
    
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Mock Citizen Dashboard')).toBeInTheDocument();
  });

  it('Employee root route -> /queue', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'e@test.com', role: 'centre_employee', full_name: 'Employee' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
    
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('Mock Queue')).toBeInTheDocument(); // assuming Queue page has 'Queue'
  });

  it('Citizen cannot render /queue', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'c@test.com', role: 'citizen', full_name: 'Citizen' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
    
    window.history.pushState({}, '', '/queue');
    render(<App />);
    // Should be redirected to /dashboard
    expect(screen.getByText('Mock Citizen Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Mock Queue')).not.toBeInTheDocument();
  });

  it('Employee cannot render Citizen dashboard', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: '1', email: 'e@test.com', role: 'centre_employee', full_name: 'Employee' },
      token: 'fake',
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
    
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    // Should be redirected to /queue
    expect(screen.queryByText('Mock Citizen Dashboard')).not.toBeInTheDocument();
  });
});
