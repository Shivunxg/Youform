import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldOff, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const PLAN_BADGE = {
  free:       'bg-gray-100 text-gray-700',
  pro:        'bg-blue-100 text-blue-700',
  business:   'bg-purple-100 text-purple-700',
  enterprise: 'bg-orange-100 text-orange-700',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function WorkspaceChips({ memberships }) {
  if (!memberships?.length) return <span className="text-xs text-gray-400">No workspaces</span>;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {memberships.map((m, i) => {
        const ws = m.workspaces;
        if (!ws) return null;
        return (
          <span
            key={ws.id ?? i}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#111] ${PLAN_BADGE[ws.plan] ?? PLAN_BADGE.free}`}
          >
            {ws.name}
            <span className="opacity-60 capitalize">· {ws.plan ?? 'free'}</span>
            <span className="opacity-50">({m.role})</span>
          </span>
        );
      })}
    </div>
  );
}

function PlanOverrideMenu({ workspaces, onApply, isPending }) {
  const [open, setOpen] = useState(false);
  const [selectedWs, setSelectedWs] = useState('');
  const [plan, setPlan] = useState('pro');

  if (!workspaces?.length) return null;

  function apply() {
    if (!selectedWs) return;
    onApply(selectedWs, plan);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold bg-white text-[#111] hover:bg-[#FFFBF2] transition-all hover:-translate-y-px disabled:opacity-50"
        style={{ boxShadow: '2px 2px 0 #111', ...SG }}
        disabled={isPending}
      >
        Override plan <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 bg-white border-2 border-[#111] rounded-xl p-3 shadow-lg w-64"
          style={{ boxShadow: '4px 4px 0 #111' }}
        >
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide" style={SG}>Override Plan</p>
          <select
            value={selectedWs}
            onChange={e => setSelectedWs(e.target.value)}
            className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-bold text-[#111] bg-white mb-2 outline-none"
            style={SG}
          >
            <option value="">Select workspace…</option>
            {workspaces.map(m => (
              <option key={m.workspaces?.id} value={m.workspaces?.id}>
                {m.workspaces?.name} (currently {m.workspaces?.plan ?? 'free'})
              </option>
            ))}
          </select>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value)}
            className="w-full border-2 border-[#111] rounded-lg px-2 py-1.5 text-xs font-bold text-[#111] bg-white mb-3 outline-none"
            style={SG}
          >
            <option value="free">Free</option>
            <option value="pro">Pro ($29/mo)</option>
            <option value="business">Business ($79/mo)</option>
            <option value="enterprise">Enterprise ($199/mo)</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={apply}
              disabled={!selectedWs || isPending}
              className="flex-1 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold bg-[#f97316] text-white hover:bg-orange-500 disabled:opacity-50"
              style={{ boxShadow: '2px 2px 0 #111', ...SG }}
            >
              Apply
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold bg-white text-[#111] hover:bg-gray-50"
              style={SG}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#111]" style={SG}>Users</h1>
          <p className="text-sm text-gray-500 mt-1" style={SG}>
            {data?.total?.toLocaleString() ?? '—'} total accounts
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
          placeholder="Search by email…"
          className="w-full max-w-sm pl-9 pr-4 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] outline-none focus:border-[#f97316] bg-white"
          style={SG}
        />
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-sm text-red-700 font-bold" style={SG}>
          Failed to load users. Check that the API is running and you have admin access.
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border-2 border-[#111]" style={{ boxShadow: '4px 4px 0 #111' }}>
        {/* Header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-0 bg-[#FFFBF2] border-b-2 border-[#111] rounded-t-xl px-5 py-3">
          <span className="text-xs font-bold text-[#111] uppercase tracking-wide" style={SG}>User</span>
          <span className="text-xs font-bold text-[#111] uppercase tracking-wide" style={SG}>Workspaces &amp; Plans</span>
          <span className="text-xs font-bold text-[#111] uppercase tracking-wide" style={SG}>Joined</span>
          <span className="text-xs font-bold text-[#111] uppercase tracking-wide w-48 text-right" style={SG}>Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100 bg-white rounded-b-xl overflow-hidden">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
              </div>
            ))
          ) : data?.users?.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400 font-bold text-sm" style={SG}>No users found</div>
          ) : (
            data?.users?.map(user => (
              <div key={user.id} className="grid grid-cols-[2fr_2fr_1fr_auto] gap-0 px-5 py-3.5 items-center hover:bg-[#FFFBF2] transition-colors">
                {/* User */}
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#111] text-sm truncate" style={SG}>{user.email}</p>
                    {user.is_platform_admin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold shrink-0">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  {user.full_name && <p className="text-xs text-gray-400 mt-0.5" style={SG}>{user.full_name}</p>}
                </div>

                {/* Workspaces */}
                <div className="pr-4">
                  <WorkspaceChips memberships={user.workspace_members} />
                </div>

                {/* Joined */}
                <div className="text-sm text-gray-500" style={SG}>{formatDate(user.created_at)}</div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end w-48 relative">
                  <PlanOverrideMenu
                    workspaces={user.workspace_members}
                    onApply={(wsId, plan) => overridePlan.mutate({ workspaceId: wsId, plan })}
                    isPending={overridePlan.isPending}
                  />
                  <button
                    onClick={() => toggleAdmin.mutate({ userId: user.id, current: user.is_platform_admin })}
                    disabled={toggleAdmin.isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold whitespace-nowrap transition-all hover:-translate-y-px disabled:opacity-50 ${
                      user.is_platform_admin
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
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
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t-2 border-[#111] bg-[#FFFBF2] rounded-b-xl">
            <span className="text-xs font-bold text-gray-500" style={SG}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border-2 border-[#111] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border-2 border-[#111] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
