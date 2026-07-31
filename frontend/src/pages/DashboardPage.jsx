import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontal, Edit2, Eye, BarChart2, Copy, Trash2, ExternalLink,
  Users, Loader, Link2, Share2, Settings, FileText, Pencil,
  ArrowRightLeft, EyeOff, RefreshCw, X, AlertTriangle, Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import AppShell from '@/components/ui/AppShell';
import CreateFormModal from '@/components/ui/CreateFormModal';
import TemplatePickerModal from '@/components/ui/TemplatePickerModal';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [modal, setModal]               = useState(null);
  const [menuOpenId, setMenuOpenId]     = useState(null);
  const [renamingId, setRenamingId]     = useState(null);
  const [renameValue, setRenameValue]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveTarget, setMoveTarget]     = useState(null);

  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { user }  = useAuthStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (user) fetchWorkspaces().catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handleKey = (e) => { if (e.key === 'Escape') setMenuOpenId(null); };
    const handleClick = () => setMenuOpenId(null);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('click', handleClick);
    };
  }, [menuOpenId]);

  const { data, isLoading } = useQuery({
    queryKey: ['forms', activeWorkspaceId],
    queryFn: () => api.forms.list(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => api.forms.rename(id, title),
    onSuccess: () => { qc.invalidateQueries(['forms']); setRenamingId(null); toast.success('Form renamed'); },
    onError: () => toast.error('Rename failed'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id) => api.forms.duplicate(id),
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Form duplicated'); },
    onError: () => toast.error('Duplicate failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.forms.setStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['forms']); },
    onError: () => toast.error('Could not update form status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.forms.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries(['forms', activeWorkspaceId]);
      const prev = qc.getQueryData(['forms', activeWorkspaceId]);
      qc.setQueryData(['forms', activeWorkspaceId], old => ({
        ...old,
        forms: (old?.forms ?? []).filter(f => f.id !== id),
      }));
      return { prev };
    },
    onError: (_, __, ctx) => { qc.setQueryData(['forms', activeWorkspaceId], ctx.prev); toast.error('Delete failed'); },
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Form deleted'); },
    onSettled: () => setDeleteTarget(null),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, workspaceId }) => api.forms.moveWorkspace(id, workspaceId),
    onMutate: async ({ id }) => {
      await qc.cancelQueries(['forms', activeWorkspaceId]);
      const prev = qc.getQueryData(['forms', activeWorkspaceId]);
      qc.setQueryData(['forms', activeWorkspaceId], old => ({
        ...old,
        forms: (old?.forms ?? []).filter(f => f.id !== id),
      }));
      return { prev };
    },
    onError: (_, __, ctx) => { qc.setQueryData(['forms', activeWorkspaceId], ctx.prev); toast.error('Move failed'); },
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Form moved'); },
    onSettled: () => setMoveTarget(null),
  });

  // ── Action handlers ────────────────────────────────────────────────────────

  function publicUrl(form) { return `${window.location.origin}/f/${form.slug}`; }
  function closeMenu() { setMenuOpenId(null); }

  function handleOpenForm(form) { closeMenu(); window.open(publicUrl(form), '_blank', 'noopener'); }
  function handleCopyLink(form) {
    closeMenu();
    navigator.clipboard.writeText(publicUrl(form))
      .then(() => toast.success('Link copied!'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = publicUrl(form);
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        toast.success('Link copied!');
      });
  }
  function handleShare(form)       { closeMenu(); navigate(`/forms/${form.id}/share`); }
  function handleSettings(form)    { closeMenu(); navigate(`/forms/${form.id}/settings`); }
  function handleSubmissions(form) { closeMenu(); navigate(`/forms/${form.id}/responses`); }
  function handleRename(form)      { closeMenu(); setRenameValue(form.title); setRenamingId(form.id); }
  function commitRename(form) {
    const trimmed = renameValue.trim();
    if (!trimmed) { toast.error('Title cannot be empty'); return; }
    if (trimmed === form.title) { setRenamingId(null); return; }
    renameMutation.mutate({ id: form.id, title: trimmed });
  }
  function handleDuplicate(form) { closeMenu(); duplicateMutation.mutate(form.id); }
  function handleMove(form)      { closeMenu(); setMoveTarget(form); }
  function handleToggleClose(form) {
    closeMenu();
    const newStatus = form.status === 'closed' ? 'draft' : 'closed';
    statusMutation.mutate({ id: form.id, status: newStatus }, { onSuccess: () => toast.success(newStatus === 'closed' ? 'Form closed' : 'Form reopened') });
  }
  function handleDeleteRequest(form) { closeMenu(); setDeleteTarget(form); }

  // ── Derived ────────────────────────────────────────────────────────────────

  const forms       = (data?.forms ?? []).filter(f => f.status !== 'archived');
  const activeWs    = workspaces.find(w => w.id === activeWorkspaceId);
  const myRole      = activeWs?.role ?? 'viewer';
  const canEdit     = ['owner', 'admin', 'editor'].includes(myRole);
  const otherSpaces = workspaces.filter(w => w.id !== activeWorkspaceId && ['owner', 'admin', 'editor'].includes(w.role));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      {modal === 'create'    && <CreateFormModal onClose={() => setModal(null)} onOpenTemplates={() => setModal('templates')} />}
      {modal === 'templates' && <TemplatePickerModal onClose={() => setModal(null)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          form={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
      {moveTarget && (
        <MoveWorkspaceModal
          form={moveTarget}
          workspaces={otherSpaces}
          onConfirm={(wsId) => moveMutation.mutate({ id: moveTarget.id, workspaceId: wsId })}
          onCancel={() => setMoveTarget(null)}
          isPending={moveMutation.isPending}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">My Forms</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeWs?.name ?? 'Loading workspace…'}
              {forms.length > 0 && ` · ${forms.length} form${forms.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate('/settings/members')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-3.5 h-3.5" /> Invite Team
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setModal('create')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> New Form
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {!activeWorkspaceId && (
          <div className="text-center py-20">
            <Loader className="w-6 h-6 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading workspace…</p>
          </div>
        )}

        {/* Grid */}
        {activeWorkspaceId && (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <FormCardSkeleton key={i} />)}
            </div>
          ) : forms.length === 0 ? (
            <EmptyState canEdit={canEdit} onCreate={() => setModal('create')} onInvite={() => navigate('/settings/members')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  canEdit={canEdit}
                  menuOpen={menuOpenId === form.id}
                  isRenaming={renamingId === form.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameCommit={() => commitRename(form)}
                  onRenameCancel={() => setRenamingId(null)}
                  onMenuToggle={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === form.id ? null : form.id); }}
                  onEdit={() => navigate(canEdit ? `/forms/${form.id}/builder` : `/forms/${form.id}/responses`)}
                  onOpenForm={() => handleOpenForm(form)}
                  onCopyLink={() => handleCopyLink(form)}
                  onShare={() => handleShare(form)}
                  onSettings={() => handleSettings(form)}
                  onSubmissions={() => handleSubmissions(form)}
                  onRename={() => handleRename(form)}
                  onDuplicate={() => handleDuplicate(form)}
                  onMove={() => handleMove(form)}
                  onToggleClose={() => handleToggleClose(form)}
                  onDeleteRequest={() => handleDeleteRequest(form)}
                  hasOtherWorkspaces={otherSpaces.length > 0}
                />
              ))}
              {/* Create new form card */}
              {canEdit && (
                <button
                  onClick={() => setModal('create')}
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 hover:bg-white hover:border-brand-300 hover:shadow-sm min-h-[180px] transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-brand-50 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 group-hover:text-brand-500 transition-colors">Create new form</span>
                </button>
              )}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

// ── FormCard ──────────────────────────────────────────────────────────────────

function FormCard({
  form, canEdit, menuOpen,
  isRenaming, renameValue, onRenameChange, onRenameCommit, onRenameCancel,
  onMenuToggle, onEdit,
  onOpenForm, onCopyLink, onShare, onSettings, onSubmissions,
  onRename, onDuplicate, onMove, onToggleClose, onDeleteRequest,
  hasOtherWorkspaces,
}) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (isRenaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [isRenaming]);

  const accent   = form.theme?.primaryColor ?? '#f97316';
  const isLive   = form.status === 'published';
  const editedAt = timeAgo(form.updated_at);
  const rate     = form.starts_count > 0
    ? `${Math.round((form.responses_count / form.starts_count) * 100)}%`
    : '—';

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl overflow-visible cursor-pointer transition-shadow hover:shadow-md flex flex-col"
      onClick={isRenaming ? undefined : onEdit}
    >
      {/* Color stripe */}
      <div className="h-1 rounded-t-xl shrink-0" style={{ backgroundColor: accent }} />

      <div className="p-4 flex-1 flex flex-col">
        {/* Status + menu row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={clsx(
            'text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize tracking-wide',
            isLive                      ? 'bg-green-50 text-green-700' :
            form.status === 'closed'    ? 'bg-amber-50 text-amber-700' :
            form.status === 'archived'  ? 'bg-red-50 text-red-600'     :
            'bg-slate-100 text-slate-500'
          )}>
            {isLive ? 'Live' : form.status}
          </span>

          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={onMenuToggle}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                menuOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
              aria-label="Form actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-9 w-52 bg-white rounded-xl border border-gray-200 shadow-xl py-1 z-30"
                onClick={e => e.stopPropagation()}
              >
                <MenuItem icon={ExternalLink} label="Open form page"   onClick={onOpenForm} />
                <MenuItem icon={Link2}        label="Copy link"         onClick={onCopyLink} />
                <MenuItem icon={Share2}       label="Share"             onClick={onShare} />
                <Divider />
                {canEdit && <MenuItem icon={Settings} label="Settings"  onClick={onSettings} />}
                <MenuItem icon={FileText}     label="Submissions"       onClick={onSubmissions} />
                <Divider />
                {canEdit && (
                  <>
                    <MenuItem icon={Pencil}          label="Rename"            onClick={onRename} />
                    <MenuItem icon={Copy}             label="Duplicate"         onClick={onDuplicate} />
                    <MenuItem
                      icon={ArrowRightLeft}
                      label="Move to workspace"
                      onClick={hasOtherWorkspaces ? onMove : undefined}
                      disabled={!hasOtherWorkspaces}
                      title={!hasOtherWorkspaces ? "You don't have any other workspaces" : undefined}
                    />
                    <Divider />
                    <MenuItem
                      icon={form.status === 'closed' ? RefreshCw : EyeOff}
                      label={form.status === 'closed' ? 'Reopen this form' : 'Close this form'}
                      onClick={onToggleClose}
                      amber
                    />
                    <MenuItem icon={Trash2} label="Delete" onClick={onDeleteRequest} danger />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={e => onRenameChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCancel(); }}
            onBlur={onRenameCommit}
            onClick={e => e.stopPropagation()}
            className="w-full text-sm font-semibold text-gray-900 border border-brand-400 rounded-lg px-2.5 py-1 outline-none bg-orange-50 mb-1"
            maxLength={200}
          />
        ) : (
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">
            {form.title || 'Untitled'}
          </h3>
        )}
        {editedAt && <p className="text-[11px] text-gray-400 mb-4">Edited {editedAt}</p>}

        {/* Stats */}
        <div className="flex gap-4 mt-auto mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 font-variant-numeric tabular-nums leading-tight">
              {(form.responses_count ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Responses</p>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">
              {(form.views_count ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Views</p>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">{rate}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Rate</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="border-t border-gray-100 pt-3 flex gap-2" onClick={e => e.stopPropagation()}>
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: accent }}
            >
              Edit
            </button>
          )}
          <button
            onClick={onShare}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────

function MenuItem({ icon: Icon, label, onClick, danger, amber, disabled, title }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors',
        disabled ? 'text-gray-300 cursor-not-allowed' :
        danger   ? 'text-red-500 hover:bg-red-50' :
        amber    ? 'text-amber-600 hover:bg-amber-50' :
        'text-gray-700 hover:bg-gray-50'
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
    </button>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 my-1" />;
}

// ── Modals ────────────────────────────────────────────────────────────────────

function DeleteConfirmModal({ form, onConfirm, onCancel, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Delete "{form.title}"?</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              This will permanently delete the form and all {(form.responses_count ?? 0).toLocaleString()} submission{form.responses_count !== 1 ? 's' : ''}. This can't be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveWorkspaceModal({ form, workspaces, onConfirm, onCancel, isPending }) {
  const [selected, setSelected] = useState(workspaces[0]?.id ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Move "{form.title}"</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Select the workspace to move this form to:</p>
        <div className="space-y-1.5 mb-5 max-h-48 overflow-y-auto">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setSelected(ws.id)}
              className={clsx(
                'w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                selected === ws.id
                  ? 'border-brand-400 bg-brand-50 text-gray-900'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              )}
            >
              {ws.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={isPending || !selected}
            className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty / skeleton ──────────────────────────────────────────────────────────

function EmptyState({ canEdit, onCreate, onInvite }) {
  return (
    <div className="text-center py-24">
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
        <FileText className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-900 text-base mb-1">No forms yet</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
        {canEdit ? 'Create your first form or start from a template.' : 'No forms have been created in this workspace yet.'}
      </p>
      {canEdit && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={onCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Create Form
          </button>
          <button onClick={onInvite} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Users className="w-4 h-4" /> Invite Team
          </button>
        </div>
      )}
    </div>
  );
}

function FormCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="h-1 bg-gray-200" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-100 rounded-full w-12" />
          <div className="h-4 w-4 bg-gray-100 rounded" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1.5" />
        <div className="h-3 bg-gray-100 rounded w-1/3 mb-5" />
        <div className="flex gap-4 mb-4">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 h-8 bg-gray-100 rounded" />)}
        </div>
        <div className="border-t border-gray-100 pt-3 flex gap-2">
          <div className="flex-1 h-8 bg-gray-200 rounded-lg" />
          <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
