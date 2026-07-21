import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

import LoginPage    from '@/pages/LoginPage';
import SignupPage   from '@/pages/SignupPage';
import DashboardPage   from '@/pages/DashboardPage';
import BuilderPage     from '@/pages/BuilderPage';
import ResponsesPage   from '@/pages/ResponsesPage';
import AnalyticsPage   from '@/pages/AnalyticsPage';
import TemplatesPage   from '@/pages/TemplatesPage';
import PublicFormPage  from '@/pages/PublicFormPage';
import AccountSettings from '@/pages/AccountSettings';

import SettingsLayout       from '@/pages/settings/SettingsLayout';
import OrganizationSettings from '@/pages/settings/OrganizationSettings';
import MembersSettings      from '@/pages/settings/MembersSettings';
import SmtpSettings         from '@/pages/settings/SmtpSettings';
import SmsSettings          from '@/pages/settings/SmsSettings';
import StripeSettings       from '@/pages/settings/StripeSettings';
import ActivityLog          from '@/pages/settings/ActivityLog';
import BillingSettings      from '@/pages/settings/BillingSettings';

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { init, user } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [user]);

  return (
    <Routes>
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/signup"  element={<SignupPage />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />

      <Route path="/" element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
      <Route path="/settings/account" element={<RequireAuth><AccountSettings /></RequireAuth>} />

      <Route path="/forms/:formId/builder"   element={<RequireAuth><BuilderPage /></RequireAuth>} />
      <Route path="/forms/:formId/responses" element={<RequireAuth><ResponsesPage /></RequireAuth>} />
      <Route path="/forms/:formId/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />

      <Route path="/settings" element={<RequireAuth><SettingsLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/settings/organization" replace />} />
        <Route path="organization" element={<OrganizationSettings />} />
        <Route path="members"      element={<MembersSettings />} />
        <Route path="smtp"         element={<SmtpSettings />} />
        <Route path="sms"          element={<SmsSettings />} />
        <Route path="stripe"       element={<StripeSettings />} />
        <Route path="activity"     element={<ActivityLog />} />
        <Route path="billing"      element={<BillingSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
