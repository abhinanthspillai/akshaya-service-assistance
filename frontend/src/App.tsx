import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { AppLayout } from './components/layout/AppLayout';
import { ServiceCatalogue } from './pages/citizen/ServiceCatalogue';
import { ServiceDetail } from './pages/citizen/ServiceDetail';
import { MyRequests } from './pages/citizen/MyRequests';
import { RequestDetail } from './pages/citizen/RequestDetail';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#faf5ff]">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Navigate to="/services" replace /></ProtectedRoute>} />

          <Route path="/services" element={<ProtectedRoute><ServiceCatalogue /></ProtectedRoute>} />
          <Route path="/services/:id" element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} />

          <Route path="/requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />

          <Route path="/notifications" element={<ProtectedRoute><div className="p-4 text-slate-600">Notifications (pending)</div></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><div className="p-4 text-slate-600">Support (pending)</div></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><div className="p-4 text-slate-600">Profile (pending)</div></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}