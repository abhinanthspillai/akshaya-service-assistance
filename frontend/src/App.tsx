import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { AppLayout } from './components/layout/AppLayout';
import { ServiceCatalogue } from './pages/citizen/ServiceCatalogue';
import { ServiceDetail } from './pages/citizen/ServiceDetail';
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
          
          <Route 
            path="/services" 
            element={<ProtectedRoute><ServiceCatalogue /></ProtectedRoute>} 
          />
          <Route 
            path="/services/:id" 
            element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} 
          />
          
          {/* Placeholders for other routes */}
          <Route path="/requests" element={<ProtectedRoute><div>My Requests (Pending)</div></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><div>Notifications (Pending)</div></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><div>Support (Pending)</div></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><div>Profile (Pending)</div></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}