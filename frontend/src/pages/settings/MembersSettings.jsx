import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { getSeatLimit } from '@/lib/plans';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { Lock } from 'lucide-react';

const ROLE_COLORS = {
  owner:  'bg-purple-100 text-purple-700',
  admin:  'bg-blue-100 text-blue-700',
  editor: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export default function MembersSettings() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');

  const { data } = useQuery({
    queryKey: ['members', activeWorkspaceId],
    queryFn: () => api.workspaces.members(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage', activeWorkspaceId],
    queryFn: () => api.workspaces.usage(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.workspaces.invite(activeWorkspaceId, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail(''); setShowInvite(false);
      qc.invalidateQueries(['members', activeWorkspaceId]);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => api.workspaces.removeMember(activeWorkspaceId, userId),
    onSuccess: () => { toast.success('Member removed'); qc.invalidateQueries(['members', activeWorkspaceId]); },
    onError: () => toast.error('Could not remove member'),
  });

  const members = data?.members ?? [];
  const plan = usageData?.plan ?? 'free';
  const seatLimit = getSeatLimit(plan);
  const atLimit = seatLimit !== null && members.length >= seatLimit;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} of {seatLimit !== null ? seatLimit : '∞'} seat{seatLimit !== 1 ? 's' : ''} used
            {seatLimit !== null && (
              <span className="ml-1 capitalize text-gray-400">· {plan} plan</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input text-sm py-1.5 w-36">
            <option>All workspaces</option>
          </select>
          {atLimit ? (
            <a href="/settings/billing" className="btn-secondary flex items-center gap-1.5 text-amber-600">
              <Lock className="w-3.5 h-3.5" /> Upgrade to invite
            </a>
          ) : (
            <button onClick={() => setShowInvite(true)} className="btn-primary">
              + Invite
            </button>
          )}
        </div>
      </div>

      {/* Seat limit warning */}
      {atLimit && (
        <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            You've reached the {seatLimit}-member limit for the <strong>{plan}</strong> plan.{' '}
            <a href="/settings/billing" className="underline font-medium">Upgrade</a> to add more members.
          </span>
        </div>
      )}

      {/* Invite form */}
      {showInvite && !atLimit && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Invite team member</h3>
          <div className="flex gap-2">
            <input
              type="email" className="input flex-1" placeholder="colleague@company.com"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            />
            <select className="input w-32" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending} className="btn-primary">
              {inviteMutation.isPending ? 'Sending…' : 'Send'}
            </button>
            <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Seat progress bar */}
      {seatLimit !== null && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Seats</span>
            <span>{members.length} / {seatLimit}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (members.length / seatLimit) * 100)}%`,
                backgroundColor: atLimit ? '#f59e0b' : '#6366f1',
              }}
            />
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="divide-y divide-gray-100">
        {members.map(m => {
          const profile = m.profiles;
          const isMe = profile?.id === user?.id;
          const initials = `${profile?.full_name?.[0] ?? profile?.email?.[0] ?? '?'}`.toUpperCase();

          return (
            <div key={profile?.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name ?? profile?.email}
                    {isMe && <span className="text-gray-400 font-normal ml-1">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={clsx('badge capitalize', ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600')}>
                  {m.role}
                </span>
                {!isMe && m.role !== 'owner' && (
                  <button
                    onClick={() => { if (confirm('Remove this member?')) removeMutation.mutate(profile.id); }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending invites */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Pending invites</h2>
        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-xl">
          No pending invites for this organization.
        </div>
      </div>
    </div>
  );
}
