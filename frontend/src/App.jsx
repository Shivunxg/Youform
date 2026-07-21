import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import BuilderPage from '@/pages/BuilderPage';
import ResponsesPage from '@/pages/ResponsesPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import TemplatesPage from '@/pages/TemplatesPage';
import SettingsPage from '@/pages/SettingsPage';
import PublicFormPage from '@/pages/PublicFormPage';

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, [init]);
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />
      <Route path="/" element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/forms/:formId/builder" element={<RequireAuth><BuilderPage /></RequireAuth>} />
      <Route path="/forms/:formId/responses" element={<RequireAuth><ResponsesPage /></RequireAuth>} />
      <Route path="/forms/:formId/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
      <Route path="/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
      <Route path="/settings/:tab?" element={<RequireAuth><SettingsPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
