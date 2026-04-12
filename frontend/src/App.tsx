import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisitDetailPage from './pages/VisitDetailPage';
import VisitFormPage from './pages/VisitFormPage';
import SearchPage from './pages/SearchPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={user ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/visits/new" element={user ? <VisitFormPage /> : <Navigate to="/login" replace />} />
      <Route path="/visits/:id" element={user ? <VisitDetailPage /> : <Navigate to="/login" replace />} />
      <Route path="/visits/:id/edit" element={user ? <VisitFormPage /> : <Navigate to="/login" replace />} />
      <Route path="/search" element={user ? <SearchPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
