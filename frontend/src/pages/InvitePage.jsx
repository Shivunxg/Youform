import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { api } from '@/lib/api';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const { fetchWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const [status, setStatus] = useState('idle'); // idle | accepting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // wait for user to log in

    setStatus('accepting');
    api.workspaces.acceptInvite(token)
      .then(async (res) => {
        await fetchWorkspaces();
        setActiveWorkspace(res.workspace_id);
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message ?? 'Failed to accept invite');
      });
  }, [user, authLoading, token]);

  const redirectParam = encodeURIComponent(`/invite/${token}`);

  if (authLoading || status === 'accepting') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#111', boxShadow: '2px 2px 0 #f97316' }}>
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900">FormFlow</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-2">You've been invited</h1>
            <p className="text-sm text-gray-500 mb-6">Sign in or create an account to accept the workspace invitation.</p>
            <div className="space-y-3">
              <Link
                to={`/login?redirect=${redirectParam}`}
                className="btn-primary w-full justify-center block text-center"
              >
                Sign in to accept
              </Link>
              <Link
                to={`/signup?redirect=${redirectParam}`}
                className="btn-secondary w-full justify-center block text-center"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Invite accepted!</h2>
          <p className="text-sm text-gray-500">Redirecting you to the workspace…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Invite error</h2>
            <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
            <Link to="/dashboard" className="btn-primary w-full justify-center block text-center">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
