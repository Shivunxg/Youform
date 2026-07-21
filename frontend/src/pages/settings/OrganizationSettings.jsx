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

  const [name, setName] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const workspace = data?.workspace;

  // Sync state when data loads
  useEffect(() => {
    if (workspace) {
      setName(workspace.name ?? '');
    }
  }, [workspace]);

  const updateMutation = useMutation({
    mutationFn: () => api.workspaces.update(activeWorkspaceId, { name }),
    onSuccess: () => { qc.invalidateQueries(['workspace', activeWorkspaceId]); toast.success('Settings updated'); },
    onError: (err) => toast.error(err.message || 'Update failed'),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Organization Settings</h1>

      <div className="space-y-6">
        {/* Org name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
          <input
            className="input"
            value={name || workspace?.name || ''}
            onChange={e => setName(e.target.value)}
            placeholder="Your organization name"
          />
        </div>

        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="btn-primary"
        >
          {updateMutation.isPending ? 'Updating…' : 'Update'}
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
