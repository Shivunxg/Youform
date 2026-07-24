import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Building2, Users, FileText, Inbox } from 'lucide-react';
import { api } from '@/lib/api';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const PLAN_BADGE = {
  free:       'bg-gray-100 text-gray-700',
  pro:        'bg-blue-100 text-blue-700',
  business:   'bg-purple-100 text-purple-700',
  enterprise: 'bg-orange-100 text-orange-700',
};

const ROLE_BADGE = {
  owner:  'bg-orange-100 text-orange-700',
  admin:  'bg-green-100 text-green-700',
  editor: 'bg-yellow-100 text-yellow-700',
  viewer: 'bg-gray-100 text-gray-600',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border-2 border-[#111] px-5 py-4"
      style={{ boxShadow: '3px 3px 0 #111' }}>
      <div className="w-9 h-9 rounded-lg border-2 border-[#111] bg-[#FFFBF2] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#111]" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide" style={SG}>{label}</p>
        <p className="text-xl font-bold text-[#111]" style={SG}>{value?.toLocaleString() ?? '—'}</p>
      </div>
    </div>
  );
}

export default function AdminWorkspaceDetail() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [planSaved, setPlanSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-workspace', workspaceId],
    queryFn: () => api.admin.workspace(workspaceId),
    onSuccess: (d) => setSelectedPlan(d?.workspace?.plan ?? 'free'),
  });

  const ws = data?.workspace;

  // Sync selectedPlan when data loads
  if (ws && !selectedPlan) setSelectedPlan(ws.plan ?? 'free');

  const overridePlan = useMutation({
    mutationFn: (plan) => api.admin.overridePlan(workspaceId, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-workspace', workspaceId] });
      qc.invalidateQueries({ queryKey: ['admin-workspaces'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setPlanSaved(true);
      setTimeout(() => setPlanSaved(false), 2500);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border-2 border-[#111] animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!ws) {
    return <div className="p-8 text-gray-500 font-bold" style={SG}>Workspace not found.</div>;
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/admin/workspaces')}
        className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#111] mb-6 transition-colors"
        style={SG}
      >
        <ChevronLeft className="w-4 h-4" /> Workspaces
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border-2 border-[#111] bg-[#f97316] flex items-center justify-center">
            <span className="text-white font-bold text-lg" style={SG}>{ws.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111]" style={SG}>{ws.name}</h1>
            <p className="text-sm text-gray-500" style={SG}>/{ws.slug} · Created {formatDate(ws.created_at)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${PLAN_BADGE[ws.plan] ?? PLAN_BADGE.free}`} style={SG}>
          {ws.plan ?? 'free'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatPill icon={Users}    label="Members"   value={ws.workspace_members?.length} />
        <StatPill icon={FileText} label="Forms"     value={ws.form_count} />
        <StatPill icon={Inbox}    label="Responses" value={ws.response_count} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-white rounded-xl border-2 border-[#111] overflow-hidden" style={{ boxShadow: '4px 4px 0 #111' }}>
          <div className="px-5 py-4 border-b-2 border-[#111] bg-[#FFFBF2]">
            <h2 className="font-bold text-[#111]" style={SG}>Members</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {ws.workspace_members?.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-bold text-[#111]" style={SG}>{m.profiles?.full_name || m.profiles?.email}</p>
                  {m.profiles?.full_name && (
                    <p className="text-xs text-gray-400" style={SG}>{m.profiles.email}</p>
                  )}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer}`} style={SG}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan override */}
        <div className="bg-white rounded-xl border-2 border-[#111] overflow-hidden" style={{ boxShadow: '4px 4px 0 #111' }}>
          <div className="px-5 py-4 border-b-2 border-[#111] bg-[#FFFBF2]">
            <h2 className="font-bold text-[#111]" style={SG}>Override plan</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-500 mb-4" style={SG}>
              Manually set this workspace's plan. This bypasses Stripe and takes effect immediately.
            </p>
            <select
              value={selectedPlan || ws.plan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] bg-white outline-none focus:border-[#f97316] mb-4"
              style={SG}
            >
              <option value="free">Free — 100 responses/mo, 1 seat</option>
              <option value="pro">Pro — 5,000 responses/mo, 3 seats</option>
              <option value="business">Business — 25,000 responses/mo, 10 seats</option>
            </select>
            <button
              onClick={() => overridePlan.mutate(selectedPlan || ws.plan)}
              disabled={overridePlan.isPending || (selectedPlan || ws.plan) === ws.plan}
              className="w-full py-2.5 bg-[#f97316] text-white font-bold text-sm rounded-lg border-2 border-[#111] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{ ...SG, boxShadow: '3px 3px 0 #111' }}
            >
              {overridePlan.isPending ? 'Applying…' : planSaved ? '✓ Plan updated' : 'Apply plan'}
            </button>
          </div>

          {/* Billing info */}
          {ws.subscription_status && (
            <div className="px-5 pb-5">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 font-bold" style={SG}>
                  Stripe status: <span className="text-[#111]">{ws.subscription_status}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
