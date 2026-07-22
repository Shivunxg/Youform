import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Edit2, Eye, BarChart2, Copy, Trash2, ExternalLink, Users, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import AppShell from '@/components/ui/AppShell';
import TemplatePickerModal from '@/components/ui/TemplatePickerModal';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const STATUS_COLORS = {
  published: 'bg-green-300 text-[#111]',
  draft:     'bg-gray-200 text-[#111]',
  closed:    'bg-yellow-300 text-[#111]',
  archived:  'bg-red-200 text-[#111]',
};

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces } = useWorkspaceStore();

  // Always fetch workspaces on dashboard load
  useEffect(() => {
    if (user) fetchWorkspaces().catch(err => console.error('Failed to fetch workspaces:', err));
  }, [user]);

  const { data, isLoading } = useQuery({
    queryKey: ['forms', activeWorkspaceId],
    queryFn: () => api.forms.list(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
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
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const myRole = activeWs?.role ?? 'viewer';
  const canEdit = ['owner', 'admin', 'editor'].includes(myRole);

  return (
    <AppShell>
      {showTemplatePicker && (
        <TemplatePickerModal onClose={() => setShowTemplatePicker(false)} />
      )}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Workspace header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {canEdit ? (
              <button
                onClick={() => navigate('/settings/members')}
                className="btn btn-secondary btn-sm text-xs py-1.5 px-3"
              >
                <Users className="w-3.5 h-3.5" />
                + Invite Team
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-lg border-2 border-[#111] text-xs font-bold text-gray-500 bg-gray-100">
                Viewer
              </span>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="btn btn-primary"
            >
              + New Form
            </button>
          )}
        </div>

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
              canEdit={canEdit}
              onCreate={() => setShowTemplatePicker(true)}
              onInvite={() => navigate('/settings/members')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  canEdit={canEdit}
                  menuOpen={menuOpen === form.id}
                  onMenuToggle={(id) => setMenuOpen(menuOpen === id ? null : id)}
                  onEdit={() => navigate(canEdit ? `/forms/${form.id}/builder` : `/forms/${form.id}/responses`)}
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

function FormCard({ form, canEdit, menuOpen, onMenuToggle, onEdit, onResponses, onAnalytics, onDuplicate, onDelete }) {
  return (
    <div
      className="bg-white rounded-xl border-2 border-[#111] group cursor-pointer overflow-hidden transition-all duration-100 hover:-translate-y-0.5"
      style={{boxShadow:'4px 4px 0 #111'}}
      onClick={onEdit}
    >
      <div className="h-2 border-b-2 border-[#111]" style={{ backgroundColor: form.theme?.primaryColor ?? '#f97316' }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold font-bold text-[#111] text-sm leading-tight line-clamp-2">{form.title || 'Untitled'}</h3>
          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onMenuToggle(form.id)}
              className="p-1.5 rounded-lg border-2 border-transparent text-[#111] opacity-0 group-hover:opacity-100 hover:border-[#111] hover:bg-[#FFFBF2] transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 w-44 bg-white rounded-xl border-2 border-[#111] py-1 z-20" style={{boxShadow:'4px 4px 0 #111'}}>
                <MenuItem icon={canEdit ? Edit2 : Eye} label={canEdit ? 'Edit' : 'View'} onClick={onEdit} />
                <MenuItem icon={BarChart2} label="Analytics" onClick={onAnalytics} />
                {form.status === 'published' && (
                  <a href={`/f/${form.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[#111] hover:bg-[#FFFBF2]">
                    <ExternalLink className="w-3.5 h-3.5" /> View live
                  </a>
                )}
                {canEdit && (
                  <>
                    <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
                    <div className="border-t-2 border-[#111] my-1" />
                    <MenuItem icon={Trash2} label="Archive" onClick={onDelete} danger />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <span className={clsx('badge text-xs capitalize mb-4 inline-block', STATUS_COLORS[form.status] ?? STATUS_COLORS.draft)}>{form.status}</span>
        <div className="flex items-center gap-4 pt-3 border-t-2 border-[#111]">
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
    <button onClick={onClick} className={clsx('w-full flex items-center gap-2 px-3 py-2 text-sm font-bold transition-colors', danger ? 'text-red-500 hover:bg-red-50' : 'text-[#111] hover:bg-[#FFFBF2]')}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function EmptyState({ canEdit, onCreate, onInvite }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-xl border-2 border-[#111] flex items-center justify-center mx-auto mb-5 text-3xl bg-yellow-300" style={{boxShadow:'4px 4px 0 #111'}}>📋</div>
      <h3 className="font-bold font-bold text-[#111] text-lg mb-1">No forms yet</h3>
      <p className="text-gray-500 text-sm mb-6">
        {canEdit ? 'Create your first form or start from a template.' : 'No forms have been created in this workspace yet.'}
      </p>
      {canEdit && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={onCreate} className="btn btn-primary">+ Create Form</button>
          <button onClick={onInvite} className="btn btn-secondary"><Users className="w-4 h-4" /> Invite Team</button>
        </div>
      )}
    </div>
  );
}

function FormCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-5 animate-pulse" style={{boxShadow:'4px 4px 0 #111'}}>
      <div className="h-2 bg-gray-200 rounded -mx-5 -mt-5 mb-5 border-b-2 border-[#111]" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
      <div className="flex gap-4 pt-3 border-t-2 border-[#111]">
        {[1,2,3].map(i => <div key={i} className="flex-1 h-8 bg-gray-100 rounded" />)}
      </div>
    </div>
  );
}
