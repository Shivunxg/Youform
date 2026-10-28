import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldOff, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const PLAN_BADGE = {
  free:       { bg: '#f3f4f6', text: '#374151', label: 'Free' },
  pro:        { bg: '#dbeafe', text: '#1d4ed8', label: 'Pro' },
  business:   { bg: '#ede9fe', text: '#6d28d9', label: 'Business' },
  enterprise: { bg: '#fed7aa', text: '#c2410c', label: 'Enterprise' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Dropdown rendered into document.body via portal — never clipped by any container
function PlanOverrideDropdown({ anchor, workspaces, onApply, isPending, onClose }) {
  const [selectedWs, setSelectedWs] = useState(workspaces?.[0]?.workspaces?.id ?? '');
  const [plan, setPlan] = useState('pro');
  const ref = useRef(null);

  // Position below the anchor button
  const style = {
    position: 'fixed',
    top: anchor.bottom + 6,
    right: window.innerWidth - anchor.right,
    zIndex: 9999,
    width: 272,
  };

  // Close on outside click or Escape
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  function apply() {
    if (!selectedWs) return;
    onApply(selectedWs, plan);
    onClose();
  }

  return createPortal(
    <div
      ref={ref}
      className="bg-white border-2 border-[#111] rounded-xl p-4"
      style={{ ...style, boxShadow: '4px 4px 0 #111' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={SG}>Override plan</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-1.5 font-medium" style={SG}>Workspace</p>
      <select
        value={selectedWs}
        onChange={e => setSelectedWs(e.target.value)}
        className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-bold text-[#111] bg-white mb-3 outline-none focus:border-[#f97316]"
        style={SG}
      >
        <option value="">Select workspace…</option>
        {workspaces.map(m => (
          <option key={m.workspaces?.id} value={m.workspaces?.id}>
            {m.workspaces?.name} · {m.workspaces?.plan ?? 'free'}
          </option>
        ))}
      </select>

      <p className="text-xs text-gray-500 mb-1.5 font-medium" style={SG}>New plan</p>
      <select
        value={plan}
        onChange={e => setPlan(e.target.value)}
        className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-bold text-[#111] bg-white mb-4 outline-none focus:border-[#f97316]"
        style={SG}
      >
        <option value="free">Free</option>
        <option value="pro">Pro — $25/mo</option>
        <option value="business">Business — $89/mo</option>
      </select>

      <div className="flex gap-2">
        <button
          onClick={apply}
          disabled={!selectedWs || isPending}
          className="flex-1 py-2 rounded-lg border-2 border-[#111] text-xs font-bold bg-[#f97316] text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"
          style={{ boxShadow: '2px 2px 0 #111', ...SG }}
        >
          {isPending ? 'Applying…' : 'Apply'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border-2 border-[#111] text-xs font-bold bg-white text-[#111] hover:bg-gray-50 transition-colors"
          style={SG}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

function PlanOverrideButton({ workspaces, onApply, isPending }) {
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);

  if (!workspaces?.length) return null;

  function toggle() {
    if (anchor) { setAnchor(null); return; }
    const rect = btnRef.current.getBoundingClientRect();
    setAnchor(rect);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold whitespace-nowrap transition-all disabled:opacity-50 ${anchor ? 'bg-[#f97316] text-white' : 'bg-white text-[#111] hover:bg-[#FFFBF2]'}`}
        style={{ boxShadow: '2px 2px 0 #111', ...SG }}
      >
        Override plan <ChevronDown className="w-3 h-3" />
      </button>
      {anchor && (
        <PlanOverrideDropdown
          anchor={anchor}
          workspaces={workspaces}
          onApply={onApply}
          isPending={isPending}
          onClose={() => setAnchor(null)}
        />
      )}
    </>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const doSearch = useCallback((val) => {
    clearTimeout(window._adminUserDebounce);
    window._adminUserDebounce = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () => api.admin.users({
      page,
      limit: 25,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
  });

  const toggleAdmin = useMutation({
    mutationFn: ({ userId, current }) => api.admin.toggleAdmin(userId, !current),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const overridePlan = useMutation({
    mutationFn: ({ workspaceId, plan }) => api.admin.overridePlan(workspaceId, plan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 25);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111]" style={SG}>Users</h1>
        <p className="text-sm text-gray-500 mt-1" style={SG}>
          {data?.total?.toLocaleString() ?? '—'} total accounts
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
          placeholder="Search by email…"
          className="w-full pl-9 pr-4 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] outline-none focus:border-[#f97316] bg-white"
          style={SG}
        />
      </div>

      {/* Error */}
      {isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border-2 border-red-300 rounded-xl text-sm text-red-700 font-bold" style={SG}>
          Failed to load users. Check that the API is running and you have admin access.
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        {/* Header */}
        <div className="grid items-center px-4 py-2" style={{ gridTemplateColumns: '1fr 200px 120px 260px' }}>
          {['User', 'Workspaces & Plans', 'Joined', ''].map((h, i) => (
            <span key={i} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider" style={SG}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="bg-white rounded-xl border-2 border-[#111]" style={{ boxShadow: '4px 4px 0 #111' }}>
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0">
                <div className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
              </div>
            ))
          ) : !data?.users?.length ? (
            <div className="px-5 py-12 text-center text-gray-400 font-bold text-sm" style={SG}>
              No users found
            </div>
          ) : (
            data.users.map((user, idx) => {
              const wsMap = PLAN_BADGE;
              const memberships = user.workspace_members ?? [];
              return (
                <div
                  key={user.id}
                  className={`grid items-center px-5 py-4 ${idx < data.users.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-[#FFFBF2] transition-colors`}
                  style={{ gridTemplateColumns: '1fr 200px 120px 260px' }}
                >
                  {/* User info */}
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#111] truncate" style={SG}>{user.email}</span>
                      {user.is_platform_admin && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                          style={{ background: '#fff3e8', color: '#c2410c', border: '1px solid #fed7aa' }}
                        >
                          <Shield className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                    </div>
                    {user.full_name && (
                      <p className="text-xs text-gray-400 mt-0.5" style={SG}>{user.full_name}</p>
                    )}
                  </div>

                  {/* Workspaces */}
                  <div className="pr-4">
                    {memberships.length === 0 ? (
                      <span className="text-xs text-gray-400" style={SG}>No workspaces</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {memberships.map((m, i) => {
                          const ws = m.workspaces;
                          if (!ws) return null;
                          const badge = PLAN_BADGE[ws.plan] ?? PLAN_BADGE.free;
                          return (
                            <span
                              key={ws.id ?? i}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border border-current"
                              style={{ background: badge.bg, color: badge.text }}
                            >
                              {ws.name}
                              <span className="opacity-60 capitalize font-medium">· {ws.plan ?? 'free'}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Joined date */}
                  <div className="text-sm text-gray-500" style={SG}>
                    {formatDate(user.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <PlanOverrideButton
                      workspaces={memberships}
                      onApply={(wsId, plan) => overridePlan.mutate({ workspaceId: wsId, plan })}
                      isPending={overridePlan.isPending}
                    />
                    <button
                      onClick={() => toggleAdmin.mutate({ userId: user.id, current: user.is_platform_admin })}
                      disabled={toggleAdmin.isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold whitespace-nowrap transition-all disabled:opacity-50 ${
                        user.is_platform_admin
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-white text-[#111] hover:bg-[#FFFBF2]'
                      }`}
                      style={{ boxShadow: '2px 2px 0 #111', ...SG }}
                    >
                      {user.is_platform_admin
                        ? <><ShieldOff className="w-3 h-3" /> Revoke</>
                        : <><Shield className="w-3 h-3" /> Make admin</>}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1 pt-2">
            <span className="text-xs font-bold text-gray-500" style={SG}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border-2 border-[#111] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
                style={{ boxShadow: '2px 2px 0 #111' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border-2 border-[#111] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
                style={{ boxShadow: '2px 2px 0 #111' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
