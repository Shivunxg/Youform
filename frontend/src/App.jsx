import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { supabase } from '@/lib/supabase';

import LoginPage    from '@/pages/LoginPage';
import SignupPage   from '@/pages/SignupPage';
import DashboardPage   from '@/pages/DashboardPage';
import BuilderPage      from '@/pages/BuilderPage';
import ResponsesPage    from '@/pages/ResponsesPage';
import AnalyticsPage    from '@/pages/AnalyticsPage';
import IntegratePage    from '@/pages/IntegratePage';
import SharePage        from '@/pages/SharePage';
import FormSettingsPage from '@/pages/FormSettingsPage';
import TemplatesPage        from '@/pages/TemplatesPage';
import TypeformImportPage   from '@/pages/TypeformImportPage';
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

import AdminLoginPage        from '@/pages/admin/AdminLoginPage';
import AdminLayout           from '@/pages/admin/AdminLayout';
import AdminDashboard        from '@/pages/admin/AdminDashboard';
import AdminUsers            from '@/pages/admin/AdminUsers';
import AdminWorkspaces       from '@/pages/admin/AdminWorkspaces';
import AdminWorkspaceDetail  from '@/pages/admin/AdminWorkspaceDetail';

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

// Checks Supabase profile for is_platform_admin flag.
// The backend also enforces this on every /api/admin/* call.
function RequireAdmin({ children }) {
  const { user, loading: authLoading } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(null); // null = still checking

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_platform_admin))
      .catch(() => setIsAdmin(false));
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) return <Spinner />;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  const { init, user } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (user) fetchWorkspaces().catch(err => console.error('Failed to fetch workspaces:', err));
  }, [user]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"   element={<LoginPage />} />
      <Route path="/signup"  element={<SignupPage />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />

      {/* App */}
      <Route path="/" element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
      <Route path="/import/typeform" element={<RequireAuth><TypeformImportPage /></RequireAuth>} />
      <Route path="/settings/account" element={<RequireAuth><AccountSettings /></RequireAuth>} />

      <Route path="/forms/:formId/builder"   element={<RequireAuth><BuilderPage /></RequireAuth>} />
      <Route path="/forms/:formId/responses" element={<RequireAuth><ResponsesPage /></RequireAuth>} />
      <Route path="/forms/:formId/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
      <Route path="/forms/:formId/integrate" element={<RequireAuth><IntegratePage /></RequireAuth>} />
      <Route path="/forms/:formId/share"     element={<RequireAuth><SharePage /></RequireAuth>} />
      <Route path="/forms/:formId/settings"  element={<RequireAuth><FormSettingsPage /></RequireAuth>} />

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

      {/* Admin portal — separate auth check, separate layout */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard"              element={<AdminDashboard />} />
        <Route path="users"                  element={<AdminUsers />} />
        <Route path="workspaces"             element={<AdminWorkspaces />} />
        <Route path="workspaces/:workspaceId" element={<AdminWorkspaceDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
