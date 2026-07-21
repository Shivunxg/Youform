import { ClipboardList, Lock } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const ACTIVITY_ICONS = {
  form_created:    '📝',
  form_published:  '🚀',
  form_deleted:    '🗑️',
  response_deleted:'❌',
  member_invited:  '👋',
  member_removed:  '👤',
  settings_updated:'⚙️',
};

// Mock activity data — in production this comes from a DB table
const MOCK_ACTIVITY = [
  { id: 1, action: 'form_created',    description: 'Created form "Contact Us"',         user: 'shivunxg@gmail.com', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, action: 'form_published',  description: 'Published form "Product Feedback"', user: 'shivunxg@gmail.com', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, action: 'member_invited',  description: 'Invited team@company.com',          user: 'shivunxg@gmail.com', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 4, action: 'settings_updated','description': 'Updated organization settings',    user: 'shivunxg@gmail.com', created_at: new Date(Date.now() - 172800000).toISOString() },
];

export default function ActivityLog() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [isPro] = useState(false);

  if (!isPro) {
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
      <h1 className="text-xl font-bold text-gray-900 mb-6">Activity Log</h1>
      <div className="space-y-1">
        {MOCK_ACTIVITY.map(activity => (
          <div key={activity.id} className="flex items-start gap-3 py-3 border-b border-gray-100">
            <span className="text-xl mt-0.5">{ACTIVITY_ICONS[activity.action] ?? '📋'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{activity.user}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {formatTime(activity.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

import { useState } from 'react';
