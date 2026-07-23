import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontal, Edit2, Eye, BarChart2, Copy, Trash2, ExternalLink,
  Users, Loader, Link2, Share2, Settings, FileText, Pencil,
  ArrowRightLeft, EyeOff, RefreshCw, X, Check, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import AppShell from '@/components/ui/AppShell';
import CreateFormModal from '@/components/ui/CreateFormModal';
import TemplatePickerModal from '@/components/ui/TemplatePickerModal';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const STATUS_COLORS = {
  published: 'bg-green-300 text-[#111]',
  draft:     'bg-gray-200 text-[#111]',
  closed:    'bg-yellow-300 text-[#111]',
  archived:  'bg-red-200 text-[#111]',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function publicUrl(form) {
  return `${window.location.origin}/f/${form.slug}`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [modal, setModal]               = useState(null); // null|'create'|'templates'
  const [menuOpenId, setMenuOpenId]     = useState(null);
  const [renamingId, setRenamingId]     = useState(null);
  const [renameValue, setRenameValue]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // form object
  const [moveTarget, setMoveTarget]     = useState(null); // form object

  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { user }  = useAuthStore();
  const { workspaces, activeWorkspaceId, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    if (user) fetchWorkspaces().catch(() => {});
  }, [user]);

  // Close menu on outside click or Esc
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
    onSuccess: () => {
      qc.invalidateQueries(['forms']);
      setRenamingId(null);
      toast.success('Form renamed');
    },
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
    onError: (_, __, ctx) => {
      qc.setQueryData(['forms', activeWorkspaceId], ctx.prev);
      toast.error('Delete failed');
    },
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
    onError: (_, __, ctx) => {
      qc.setQueryData(['forms', activeWorkspaceId], ctx.prev);
      toast.error('Move failed');
    },
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Form moved'); },
    onSettled: () => setMoveTarget(null),
  });

  // ── Action handlers ────────────────────────────────────────────────────────

  function closeMenu() { setMenuOpenId(null); }

  function handleOpenForm(form) {
    closeMenu();
    window.open(publicUrl(form), '_blank', 'noopener');
  }

  function handleCopyLink(form) {
    closeMenu();
    navigator.clipboard.writeText(publicUrl(form))
      .then(() => toast.success('Link copied!'))
      .catch(() => {
        // Fallback for browsers without clipboard API
        const ta = document.createElement('textarea');
        ta.value = publicUrl(form);
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Link copied!');
      });
  }

  function handleShare(form) {
    closeMenu();
    navigate(`/forms/${form.id}/share`);
  }

  function handleSettings(form) {
    closeMenu();
    navigate(`/forms/${form.id}/settings`);
  }

  function handleSubmissions(form) {
    closeMenu();
    navigate(`/forms/${form.id}/responses`);
  }

  function handleRename(form) {
    closeMenu();
    setRenameValue(form.title);
    setRenamingId(form.id);
  }

  function commitRename(form) {
    const trimmed = renameValue.trim();
    if (!trimmed) { toast.error('Title cannot be empty'); return; }
    if (trimmed === form.title) { setRenamingId(null); return; }
    renameMutation.mutate({ id: form.id, title: trimmed });
  }

  function handleDuplicate(form) {
    closeMenu();
    duplicateMutation.mutate(form.id);
  }

  function handleMove(form) {
    closeMenu();
    setMoveTarget(form);
  }

  function handleToggleClose(form) {
    closeMenu();
    const newStatus = form.status === 'closed' ? 'draft' : 'closed';
    const msg = newStatus === 'closed' ? 'Form closed' : 'Form reopened';
    statusMutation.mutate(
      { id: form.id, status: newStatus },
      { onSuccess: () => toast.success(msg) }
    );
  }

  function handleDeleteRequest(form) {
    closeMenu();
    setDeleteTarget(form);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const forms        = (data?.forms ?? []).filter(f => f.status !== 'archived');
  const activeWs     = workspaces.find(w => w.id === activeWorkspaceId);
  const myRole       = activeWs?.role ?? 'viewer';
  const canEdit      = ['owner', 'admin', 'editor'].includes(myRole);
  const otherSpaces  = workspaces.filter(w => w.id !== activeWorkspaceId && ['owner', 'admin', 'editor'].includes(w.role));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      {/* Create modals */}
      {modal === 'create' && (
        <CreateFormModal onClose={() => setModal(null)} onOpenTemplates={() => setModal('templates')} />
      )}
      {modal === 'templates' && (
        <TemplatePickerModal onClose={() => setModal(null)} />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          form={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      {/* Move to workspace */}
      {moveTarget && (
        <MoveWorkspaceModal
          form={moveTarget}
          workspaces={otherSpaces}
          onConfirm={(wsId) => moveMutation.mutate({ id: moveTarget.id, workspaceId: wsId })}
          onCancel={() => setMoveTarget(null)}
          isPending={moveMutation.isPending}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {canEdit ? (
              <button onClick={() => navigate('/settings/members')} className="btn btn-secondary btn-sm text-xs py-1.5 px-3">
                <Users className="w-3.5 h-3.5" /> + Invite Team
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-lg border-2 border-[#111] text-xs font-bold text-gray-500 bg-gray-100">Viewer</span>
            )}
          </div>
          {canEdit && (
            <button onClick={() => setModal('create')} className="btn btn-primary">+ New Form</button>
          )}
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
                  // Menu actions
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
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const thumbnailBg   = form.theme?.backgroundColor ?? '#f1f5f9';
  const thumbnailText = form.theme?.questionColor   ?? '#111111';
  const thumbnailFont = form.theme?.fontFamily      ?? 'Playfair Display, Georgia, serif';
  const responseCount = form.responses_count ?? 0;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 group cursor-pointer overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md flex flex-col"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      onClick={isRenaming ? undefined : onEdit}
    >
      {/* ── Thumbnail ── */}
      <div
        className="h-40 flex items-center justify-center px-6 overflow-hidden shrink-0"
        style={{ backgroundColor: thumbnailBg }}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={e => onRenameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRenameCommit();
              if (e.key === 'Escape') onRenameCancel();
            }}
            onBlur={onRenameCommit}
            onClick={e => e.stopPropagation()}
            className="w-full text-center text-lg font-bold border-2 border-[#f97316] rounded-lg px-3 py-1.5 outline-none bg-white/90"
            style={{ fontFamily: thumbnailFont, color: thumbnailText }}
            maxLength={200}
          />
        ) : (
          <p
            className="text-xl font-bold text-center leading-snug line-clamp-3 select-none"
            style={{ color: thumbnailText, fontFamily: thumbnailFont }}
          >
            {form.title || 'Untitled'}
          </p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <span className="text-xs text-gray-400 font-medium" style={SG}>
          {responseCount === 0
            ? 'No responses'
            : `${responseCount} response${responseCount !== 1 ? 's' : ''}`}
        </span>

        {/* ··· menu */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={onMenuToggle}
            className={clsx(
              'p-1.5 rounded-lg border-2 text-[#111] transition-all',
              menuOpen
                ? 'border-[#f97316] bg-[#FFFBF2] opacity-100'
                : 'border-transparent opacity-0 group-hover:opacity-100 hover:border-[#111] hover:bg-[#FFFBF2]'
            )}
            aria-label="Form actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 bottom-9 w-52 bg-white rounded-xl border-2 border-[#111] py-1 z-30"
              style={{ boxShadow: '4px 4px 0 #111' }}
              onClick={e => e.stopPropagation()}
            >
              <MenuItem icon={ExternalLink} label="Open Form Page" onClick={onOpenForm} />
              <MenuItem icon={Link2}        label="Copy Form Link" onClick={onCopyLink} />
              <MenuItem icon={Share2}       label="Share"          onClick={onShare} />
              <Divider />
              {canEdit && <MenuItem icon={Settings}  label="Settings"    onClick={onSettings} />}
              <MenuItem   icon={FileText}   label="Submissions"    onClick={onSubmissions} />
              <Divider />
              {canEdit && (
                <>
                  <MenuItem icon={Pencil}        label="Rename"             onClick={onRename} />
                  <MenuItem icon={Copy}           label="Duplicate"          onClick={onDuplicate} />
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
        'w-full flex items-center gap-2 px-3 py-2 text-sm font-bold transition-colors',
        disabled ? 'text-gray-300 cursor-not-allowed' :
        danger   ? 'text-red-500 hover:bg-red-50' :
        amber    ? 'text-amber-600 hover:bg-amber-50' :
        'text-[#111] hover:bg-[#FFFBF2]'
      )}
      style={SG}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
    </button>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 my-1" />;
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-sm font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────

function DeleteConfirmModal({ form, onConfirm, onCancel, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111]/50" onClick={onCancel} />
      <div
        className="relative bg-white rounded-2xl border-2 border-[#111] p-6 w-full max-w-md"
        style={{ boxShadow: '8px 8px 0 #111' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl border-2 border-red-400 bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-[#111] text-base" style={SG}>Delete "{form.title}"?</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              This will permanently delete the form and all {(form.responses_count ?? 0).toLocaleString()} submission{form.responses_count !== 1 ? 's' : ''}. This can't be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border-2 border-[#111] text-sm font-bold text-[#111] bg-white hover:bg-gray-50 transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0 #111', ...SG }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border-2 border-red-500 text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '2px 2px 0 #7f1d1d', ...SG }}
          >
            {isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Move workspace modal ───────────────────────────────────────────────────────

function MoveWorkspaceModal({ form, workspaces, onConfirm, onCancel, isPending }) {
  const [selected, setSelected] = useState(workspaces[0]?.id ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#111]/50" onClick={onCancel} />
      <div
        className="relative bg-white rounded-2xl border-2 border-[#111] p-6 w-full max-w-sm"
        style={{ boxShadow: '8px 8px 0 #111' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#111] text-base" style={SG}>Move "{form.title}"</h3>
          <button onClick={onCancel} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Select the workspace to move this form to:</p>
        <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setSelected(ws.id)}
              className={clsx(
                'w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all',
                selected === ws.id
                  ? 'border-[#f97316] bg-[#FFFBF2] text-[#111]'
                  : 'border-[#111] bg-white text-[#111] hover:bg-gray-50'
              )}
              style={SG}
            >
              {ws.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border-2 border-[#111] text-sm font-bold text-[#111] bg-white hover:bg-gray-50 disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0 #111', ...SG }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={isPending || !selected}
            className="px-4 py-2 rounded-xl border-2 border-[#111] text-sm font-bold text-white bg-[#111] hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '2px 2px 0 #f97316', ...SG }}
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
      <div className="w-16 h-16 rounded-xl border-2 border-[#111] flex items-center justify-center mx-auto mb-5 text-3xl bg-yellow-300" style={{ boxShadow: '4px 4px 0 #111' }}>📋</div>
      <h3 className="font-bold text-[#111] text-lg mb-1" style={SG}>No forms yet</h3>
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
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div className="h-40 bg-gray-100" />
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-6 w-6 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
