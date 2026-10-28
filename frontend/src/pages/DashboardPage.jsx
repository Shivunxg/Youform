import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Edit2, BarChart2, Copy, Trash2, ExternalLink, Users, Loader, FileText, MousePointerClick, TrendingUp, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import AppShell from '@/components/ui/AppShell';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const STATUS_COLORS = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-gray-100 text-gray-600',
  closed:    'bg-orange-100 text-orange-700',
  archived:  'bg-red-100 text-red-600',
};

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces } = useWorkspaceStore();

  // Always fetch workspaces on dashboard load
  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [user]);

  const { data, isLoading } = useQuery({
    queryKey: ['forms', activeWorkspaceId],
    queryFn: () => api.forms.list(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Re-fetch workspace if missing
      let wsId = activeWorkspaceId;
      if (!wsId) {
        const ws = await fetchWorkspaces();
        wsId = ws?.[0]?.id;
      }
      if (!wsId) throw new Error('No workspace found. Please refresh.');
      return api.forms.create(wsId, { title: 'Untitled form' });
    },
    onSuccess: ({ form }) => navigate(`/forms/${form.id}/builder`),
    onError: (err) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id) => api.forms.duplicate(id),
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Form duplicated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.forms.delete(id),
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Form archived'); },
  });

  const forms = data?.forms ?? [];

  const totalResponses = forms.reduce((s, f) => s + (f.responses_count ?? 0), 0);
  const totalViews     = forms.reduce((s, f) => s + (f.views_count ?? 0), 0);
  const publishedCount = forms.filter(f => f.status === 'published').length;

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-5xl">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage all your forms in one place.</p>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Form
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatTile icon={FileText}         color="brand" label="Total Forms"     value={forms.length}     sub={`${publishedCount} published`} />
          <StatTile icon={MousePointerClick} color="green" label="Total Responses" value={totalResponses}   sub="all time" />
          <StatTile icon={TrendingUp}        color="orange" label="Total Views"    value={totalViews}       sub="all forms" />
        </div>

        {/* Response history chart */}
        {forms.length > 0 && <ResponsesChart forms={forms} />}

        {/* Loading workspace */}
        {!activeWorkspaceId && (
          <div className="text-center py-20">
            <Loader className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading workspace…</p>
          </div>
        )}

        {/* Forms grid */}
        {activeWorkspaceId && (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <FormCardSkeleton key={i} />)}
            </div>
          ) : forms.length === 0 ? (
            <EmptyState
              onCreate={() => createMutation.mutate()}
              onInvite={() => navigate('/settings/members')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  menuOpen={menuOpen === form.id}
                  onMenuToggle={(id) => setMenuOpen(menuOpen === id ? null : id)}
                  onEdit={() => navigate(`/forms/${form.id}/builder`)}
                  onResponses={() => navigate(`/forms/${form.id}/responses`)}
                  onAnalytics={() => navigate(`/forms/${form.id}/analytics`)}
                  onDuplicate={() => { duplicateMutation.mutate(form.id); setMenuOpen(null); }}
                  onDelete={() => { if (confirm('Archive this form?')) deleteMutation.mutate(form.id); setMenuOpen(null); }}
                />
              ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

function ResponsesChart({ forms }) {
  const sorted = [...forms].sort((a, b) => (b.responses_count ?? 0) - (a.responses_count ?? 0)).slice(0, 8);
  const max = Math.max(...sorted.map(f => f.responses_count ?? 0), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <p className="text-sm font-semibold text-gray-700 mb-4">Response History by Form</p>
      <div className="space-y-2.5">
        {sorted.map(f => {
          const count = f.responses_count ?? 0;
          const pct = Math.max((count / max) * 100, count > 0 ? 4 : 0);
          return (
            <div key={f.id} className="flex items-center gap-3">
              <p className="text-xs text-gray-500 w-32 truncate shrink-0">{f.title || 'Untitled'}</p>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: f.theme?.primaryColor ?? '#6366f1' }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600 w-8 text-right tabular-nums shrink-0">{count}</span>
            </div>
          );
        })}
        {sorted.every(f => !f.responses_count) && (
          <p className="text-sm text-gray-400 text-center py-4">No responses yet — share your forms to get started.</p>
        )}
      </div>
    </div>
  );
}

const TILE_COLORS = {
  brand:  { bg: 'bg-brand-50',  icon: 'text-brand-500',  val: 'text-brand-700' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-500',  val: 'text-green-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-500', val: 'text-orange-700' },
};

function StatTile({ icon: Icon, color, label, value, sub }) {
  const c = TILE_COLORS[color] ?? TILE_COLORS.brand;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', c.bg)}>
        <Icon className={clsx('w-5 h-5', c.icon)} />
      </div>
      <div>
        <p className={clsx('text-2xl font-bold tabular-nums', c.val)}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label} <span className="text-gray-400">· {sub}</span></p>
      </div>
    </div>
  );
}

function FormCard({ form, menuOpen, onMenuToggle, onEdit, onResponses, onAnalytics, onDuplicate, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-150 group cursor-pointer overflow-hidden" onClick={onEdit}>
      <div className="h-1.5" style={{ backgroundColor: form.theme?.primaryColor ?? '#6366f1' }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{form.title || 'Untitled'}</h3>
          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => onMenuToggle(form.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <MenuItem icon={Edit2}     label="Edit"      onClick={onEdit} />
                <MenuItem icon={BarChart2} label="Analytics" onClick={onAnalytics} />
                <MenuItem icon={Copy}      label="Duplicate" onClick={onDuplicate} />
                {form.status === 'published' && (
                  <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <ExternalLink className="w-3.5 h-3.5" /> View live
                  </a>
                )}
                <div className="border-t border-gray-100 my-1" />
                <MenuItem icon={Trash2} label="Archive" onClick={onDelete} danger />
              </div>
            )}
          </div>
        </div>
        <span className={clsx('badge text-xs capitalize mb-4 inline-block', STATUS_COLORS[form.status] ?? STATUS_COLORS.draft)}>{form.status}</span>
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          <Stat label="Responses" value={form.responses_count ?? 0} />
          <Stat label="Views"     value={form.views_count ?? 0} />
          <Stat label="Rate"      value={form.starts_count > 0 ? `${Math.round((form.responses_count / form.starts_count) * 100)}%` : '—'} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} className={clsx('w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors', danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50')}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function EmptyState({ onCreate, onInvite }) {
  return (
    <div className="text-center py-24">
      <div className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto mb-4 text-2xl text-gray-400">!</div>
      <p className="text-gray-500 mb-1">No forms created in this workspace yet.</p>
      <p className="text-gray-400 text-sm mb-6">What would you like to do?</p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={onCreate} className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
          + Create Form
        </button>
        <button onClick={onInvite} className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Users className="w-4 h-4" /> Invite Team
        </button>
      </div>
    </div>
  );
}

function FormCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="h-1.5 bg-gray-200 rounded -mx-5 -mt-5 mb-5" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
      <div className="flex gap-4 pt-3 border-t border-gray-100">
        {[1,2,3].map(i => <div key={i} className="flex-1 h-8 bg-gray-100 rounded" />)}
      </div>
    </div>
  );
}
