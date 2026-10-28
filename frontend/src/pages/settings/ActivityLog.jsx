import { useState } from 'react';
import { ClipboardList, Lock, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { hasFeature } from '@/lib/plans';

const ACTION_ICONS = {
  form_created:     '📝',
  form_published:   '🚀',
  form_deleted:     '🗑️',
  response_deleted: '❌',
  member_invited:   '👋',
  member_removed:   '👤',
  settings_updated: '⚙️',
};

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function ActivityLog() {
  const { activeWorkspaceId } = useWorkspaceStore();

  const { data: usageData } = useQuery({
    queryKey: ['usage', activeWorkspaceId],
    queryFn: () => api.workspaces.usage(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const plan = usageData?.plan ?? 'free';
  const canAccess = hasFeature(plan, 'activity_log');

  const { data: activityData, isLoading, refetch } = useQuery({
    queryKey: ['activity', activeWorkspaceId],
    queryFn: () => api.workspaces.activity(activeWorkspaceId),
    enabled: !!activeWorkspaceId && canAccess,
  });

  const activities = activityData?.activities ?? [];

  if (!canAccess) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Activity Log</h1>
        <p className="text-sm text-gray-500 mb-8">Audit trail of actions performed by team members in this organization.</p>
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">Activity Log is a Business feature</p>
          <p className="text-sm text-gray-400 mb-5">Upgrade to the Business plan to access a full audit trail of all organization actions.</p>
          <a href="/settings/billing" className="btn-primary">Upgrade to Business</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Audit trail of all actions in this organization.</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost p-2" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 animate-pulse">
              <div className="w-8 h-8 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700 mb-1">No activity yet</p>
          <p className="text-sm text-gray-400">Actions like creating forms and inviting members will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map(activity => {
            const name = activity.profiles?.full_name || activity.profiles?.email || 'Unknown';
            const email = activity.profiles?.email;
            return (
              <div key={activity.id} className="flex items-start gap-3 py-3 border-b border-gray-100">
                <span className="text-xl mt-0.5 shrink-0">{ACTION_ICONS[activity.action] ?? '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{name}{email && name !== email ? ` · ${email}` : ''}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {formatTime(activity.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
