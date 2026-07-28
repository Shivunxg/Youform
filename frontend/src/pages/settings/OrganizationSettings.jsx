import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import toast from 'react-hot-toast';

export default function OrganizationSettings() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['workspace', activeWorkspaceId],
    queryFn: () => api.workspaces.get(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const [name,    setName]    = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const workspace = data?.workspace;

  useEffect(() => {
    if (workspace) {
      setName(workspace.name ?? '');
      setLogoUrl(workspace.logo_url ?? '');
    }
  }, [workspace]);

  const updateMutation = useMutation({
    mutationFn: () => api.workspaces.update(activeWorkspaceId, { name, logo_url: logoUrl || null }),
    onSuccess: () => { qc.invalidateQueries(['workspace', activeWorkspaceId]); toast.success('Settings updated'); },
    onError: (err) => toast.error(err.message || 'Update failed'),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Organization</h1>

      <div className="space-y-6">
        {/* Org name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization name</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your organization name"
          />
        </div>

        <hr className="border-gray-100" />

        {/* Branding */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-0.5">Branding</h2>
          <p className="text-sm text-gray-500 mb-4">Your logo appears at the bottom of every public form. On Pro/Business plans the "Powered by FormFlow" badge is hidden automatically.</p>

          <label className="block text-sm font-medium text-gray-700 mb-1.5">Company logo URL</label>
          <input
            className="input"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://your-domain.com/logo.png"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Use a PNG or SVG with a transparent background, ideally under 200 px tall.
          </p>
          {logoUrl && (
            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 inline-flex items-center gap-3">
              <img src={logoUrl} alt="Logo preview" className="h-9 max-w-[180px] object-contain" onError={e => { e.target.style.opacity = '0.25'; }} />
              <span className="text-xs text-gray-400">preview</span>
            </div>
          )}
        </div>

        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="btn-primary"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>

        <hr className="border-gray-100" />

        {/* Email notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Submission Email Notifications</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Set the default for new form submission email notifications. Admins can still override this setting for individual forms.
            </p>
          </div>
          <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
        </div>

        <hr className="border-gray-100" />

        {/* Delete */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Delete Organization</h2>
          <p className="text-sm text-gray-500">
            If you want to delete this organization then please delete your account from{' '}
            <a href="/settings/account" className="underline text-gray-700">account settings</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
