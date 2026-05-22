import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Search from './pages/Search';
import Detail from './pages/Detail';
import IPTVChannels from './pages/IPTVChannels';
import IPTVPlayer from './pages/IPTVPlayer';
import EPGGuide from './pages/EPGGuide';
import Admin from './pages/Admin';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="text-emerald-500 animate-spin" />
      </div>
    );
  }
  if (!token) return <Navigate to="/app/login" replace />;
  return <>{children}</>;
}

function StreamingRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="watch/:type/:id" element={<ProtectedRoute><Detail /></ProtectedRoute>} />
      <Route path="iptv" element={<ProtectedRoute><IPTVChannels /></ProtectedRoute>} />
      <Route path="iptv/watch/:channelId" element={<ProtectedRoute><IPTVPlayer /></ProtectedRoute>} />
      <Route path="iptv/guide" element={<ProtectedRoute><EPGGuide /></ProtectedRoute>} />
      <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function StreamingApp() {
  return (
    <AuthProvider>
      <StreamingRoutes />
    </AuthProvider>
  );
}
