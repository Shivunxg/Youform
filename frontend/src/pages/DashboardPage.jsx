import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MoreHorizontal, Edit2, BarChart2, Copy, Trash2, ExternalLink, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
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
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { activeWorkspaceId } = useWorkspaceStore();

  const { data, isLoading } = useQuery({
    queryKey: ['forms', activeWorkspaceId, search],
    queryFn: () => api.forms.list(activeWorkspaceId, { search }),
    enabled: !!activeWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.forms.create(activeWorkspaceId, { title: 'Untitled form' }),
    onSuccess: ({ form }) => navigate(`/forms/${form.id}/builder`),
    onError: () => toast.error('Could not create form'),
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

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Forms</h1>
            <p className="text-sm text-gray-500 mt-0.5">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New form
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 max-w-sm"
            placeholder="Search forms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Forms grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <FormCardSkeleton key={i} />)}
          </div>
        ) : forms.length === 0 ? (
          <EmptyState onCreate={() => createMutation.mutate()} />
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
        )}
      </div>
    </AppShell>
  );
}

function FormCard({ form, menuOpen, onMenuToggle, onEdit, onResponses, onAnalytics, onDuplicate, onDelete }) {
  return (
    <div className="card hover:shadow-md transition-shadow duration-150 group">
      {/* Colored top bar based on theme */}
      <div
        className="h-1.5 rounded-t-xl"
        style={{ backgroundColor: form.theme?.primaryColor ?? '#6366f1' }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
            <h3 className="font-medium text-gray-900 truncate">{form.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx('badge', STATUS_COLORS[form.status] ?? STATUS_COLORS.draft)}>
                {form.status}
              </span>
              <span className="text-xs text-gray-400">{form.layout}</span>
            </div>
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => onMenuToggle(form.id)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-fade-in">
                <MenuItem icon={Edit2}      label="Edit"       onClick={onEdit} />
                <MenuItem icon={BarChart2}  label="Analytics"  onClick={onAnalytics} />
                <MenuItem icon={Copy}       label="Duplicate"  onClick={onDuplicate} />
                <div className="border-t border-gray-100 my-1" />
                <MenuItem icon={Trash2}     label="Archive"    onClick={onDelete} danger />
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <Stat label="Responses" value={form.responses_count ?? 0} />
          <Stat label="Views"     value={form.views_count ?? 0} />
          <Stat label="Starts"    value={form.starts_count ?? 0} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={onEdit}      className="btn-ghost text-xs flex-1 justify-center py-1.5"><Edit2 className="w-3 h-3" />Edit</button>
          <button onClick={onResponses} className="btn-ghost text-xs flex-1 justify-center py-1.5"><FileText className="w-3 h-3" />Responses</button>
          {form.status === 'published' && (
            <a
              href={`/f/${form.slug}`} target="_blank" rel="noreferrer"
              className="btn-ghost text-xs flex-1 justify-center py-1.5"
            >
              <ExternalLink className="w-3 h-3" />View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
        danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="text-center py-20">
      <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FileText className="w-7 h-7 text-brand-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No forms yet</h3>
      <p className="text-sm text-gray-500 mb-5">Create your first form to start collecting responses.</p>
      <button onClick={onCreate} className="btn-primary">
        <Plus className="w-4 h-4" />Create your first form
      </button>
    </div>
  );
}

function FormCardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="h-1.5 bg-gray-200 rounded-t-xl -mx-4 -mt-4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="flex gap-4 pt-3 border-t border-gray-100">
        {[1,2,3].map(i => <div key={i} className="flex-1 h-8 bg-gray-100 rounded" />)}
      </div>
    </div>
  );
}
