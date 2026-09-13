import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../Login';
import { Register } from '../Register';
import { ForgotPassword } from '../ForgotPassword';
import { AuthProvider } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() } }
  }
}));

describe('Auth UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form and links', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('renders registration form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('renders forgot password informational screen', () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Password Recovery' })).toBeInTheDocument();
    expect(screen.getByText(/Self-service recovery is not available yet/)).toBeInTheDocument();
    expect(screen.getByText('Return to Sign In')).toBeInTheDocument();
  });

  it('performs role-aware routing on login', async () => {
    (api.post as import('vitest').Mock).mockResolvedValueOnce({ data: { access_token: 'fake-token' } });
    (api.get as import('vitest').Mock).mockResolvedValueOnce({ data: { id: '1', email: 'emp@test.com', role: 'centre_employee' } });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('example@gmail.com'), { target: { value: 'emp@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledWith('/auth/me', expect.any(Object));
    });
  });
});
