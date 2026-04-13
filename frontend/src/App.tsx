import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './AuthContext';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VisitDetailPage from './pages/VisitDetailPage';
import VisitFormPage from './pages/VisitFormPage';
import SearchPage from './pages/SearchPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/visits/new" element={<VisitFormPage />} />
        <Route path="/visits/:id" element={<VisitDetailPage />} />
        <Route path="/visits/:id/edit" element={<VisitFormPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
