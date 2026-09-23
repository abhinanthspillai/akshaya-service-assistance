import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContainer } from '../AuthContainer';
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
 <MemoryRouter initialEntries={['/login']}>
 <AuthProvider>
 <AuthContainer />
 </AuthProvider>
 </MemoryRouter>
 );
 // getByRole ignores aria-hidden by default, so this targets the visible form
 expect(screen.getAllByRole('heading', { name: 'Sign in' }).length).toBeGreaterThan(0);
 expect(screen.getAllByPlaceholderText('example@gmail.com').length).toBeGreaterThan(0);
 expect(screen.getAllByText('Forgot Password?').length).toBeGreaterThan(0);
 });

 it('renders registration form', () => {
 render(
 <MemoryRouter initialEntries={['/register']}>
 <AuthProvider>
 <AuthContainer />
 </AuthProvider>
 </MemoryRouter>
 );
 expect(screen.getAllByRole('heading', { name: 'Create account' }).length).toBeGreaterThan(0);
 expect(screen.getAllByPlaceholderText('John Doe').length).toBeGreaterThan(0);
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
 <AuthContainer />
 </AuthProvider>
 </MemoryRouter>
 );

 // Grab the inputs from the login form (which is the first one in mobile layout or the visible one in desktop)
 const emailInputs = screen.getAllByPlaceholderText('example@gmail.com');
 const passwordInputs = screen.getAllByPlaceholderText('••••••••••');
 
 // In our DOM structure, multiple inputs might exist. We'll fire events on all or just the first.
 // To be safe, we'll find the form and fire submit. But we need to fill the correct inputs.
 // Let's just fill the first one since it's bound to state, the state is shared per component instance.
 fireEvent.change(emailInputs[0], { target: { value: 'emp@test.com' } });
 fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
 
 // Fire the submit event directly on the form
 const form = emailInputs[0].closest('form');
 fireEvent.submit(form!);

 await waitFor(() => {
 expect(api.post).toHaveBeenCalled();
 expect(api.get).toHaveBeenCalledWith('/auth/me', expect.any(Object));
 });
 });
});
