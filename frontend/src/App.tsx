import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { AppLayout } from './components/layout/AppLayout';
import { ServiceCatalogue } from './pages/citizen/ServiceCatalogue';
import { ServiceDetail } from './pages/citizen/ServiceDetail';
import { MyRequests } from './pages/citizen/MyRequests';
import { RequestDetail } from './pages/citizen/RequestDetail';
import { Dashboard } from './pages/citizen/Dashboard';
import { NewRequest } from './pages/citizen/NewRequest';
import { Notifications } from './pages/citizen/Notifications';
import { Support } from './pages/citizen/Support';
import { Profile } from './pages/citizen/Profile';
import { Queue } from './pages/employee/Queue';
import { RequestWorkspace } from './pages/employee/RequestWorkspace';
import { Loader2 } from 'lucide-react';

type UserRole = 'citizen' | 'centre_employee' | 'centre_administrator' | 'system_administrator';

function getRoleLandingPage(role: string): string {
  switch (role) {
    case 'citizen':
      return '/dashboard';
    case 'centre_employee':
      return '/queue';
    case 'centre_administrator':
      return '/admin/dashboard';
    case 'system_administrator':
      return '/sysadmin/dashboard';
    default:
      return '/dashboard';
  }
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to={getRoleLandingPage(user.role)} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleLandingPage(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/" element={<RootRedirect />} />
          
          {/* Citizen Routes */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['citizen']}><Dashboard /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute allowedRoles={['citizen']}><ServiceCatalogue /></ProtectedRoute>} />
          <Route path="/services/:id" element={<ProtectedRoute allowedRoles={['citizen']}><ServiceDetail /></ProtectedRoute>} />
          <Route path="/services/:id/request" element={<ProtectedRoute allowedRoles={['citizen']}><NewRequest /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute allowedRoles={['citizen']}><MyRequests /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute allowedRoles={['citizen']}><RequestDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute allowedRoles={['citizen']}><Notifications /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute allowedRoles={['citizen']}><Support /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['citizen']}><Profile /></ProtectedRoute>} />

          {/* Employee Routes */}
          <Route path="/queue" element={<ProtectedRoute allowedRoles={['centre_employee']}><Queue /></ProtectedRoute>} />
          <Route path="/employee/requests/:id" element={<ProtectedRoute allowedRoles={['centre_employee']}><RequestWorkspace /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['centre_administrator']}><div className="p-4 text-slate-600">Centre Admin Dashboard (pending)</div></ProtectedRoute>} />
          <Route path="/sysadmin/dashboard" element={<ProtectedRoute allowedRoles={['system_administrator']}><div className="p-4 text-slate-600">System Admin Dashboard (pending)</div></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
