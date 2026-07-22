import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, ChevronRight as Arrow } from 'lucide-react';
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

export default function AdminWorkspaces() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  const doSearch = useCallback((val) => {
    clearTimeout(window._adminWsDebounce);
    window._adminWsDebounce = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-workspaces', debouncedSearch, planFilter, page],
    queryFn: () => api.admin.workspaces({
      page,
      limit: 25,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(planFilter ? { plan: planFilter } : {}),
    }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 25);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111]" style={SG}>Workspaces</h1>
        <p className="text-sm text-gray-500 mt-1" style={SG}>
          {data?.total?.toLocaleString() ?? '—'} total workspaces
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
            placeholder="Search by name…"
            className="pl-9 pr-4 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] outline-none focus:border-[#f97316] bg-white w-64"
            style={SG}
          />
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] bg-white outline-none focus:border-[#f97316]"
          style={SG}
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border-2 border-[#111] overflow-hidden" style={{ boxShadow: '4px 4px 0 #111' }}>
        <table className="w-full text-sm" style={SG}>
          <thead>
            <tr className="border-b-2 border-[#111] bg-[#FFFBF2]">
              <th className="text-left px-5 py-3 font-bold text-[#111]">Workspace</th>
              <th className="text-left px-5 py-3 font-bold text-[#111]">Plan</th>
              <th className="text-right px-5 py-3 font-bold text-[#111]">Responses</th>
              <th className="text-left px-5 py-3 font-bold text-[#111]">Created</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td colSpan={5} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                  </td>
                </tr>
              ))
            ) : data?.workspaces?.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-bold">No workspaces found</td></tr>
            ) : (
              data?.workspaces?.map(ws => (
                <tr
                  key={ws.id}
                  onClick={() => navigate(`/admin/workspaces/${ws.id}`)}
                  className="border-b border-gray-100 hover:bg-[#FFFBF2] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-[#111]">{ws.name}</p>
                    <p className="text-xs text-gray-400">{ws.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PLAN_BADGE[ws.plan] ?? PLAN_BADGE.free}`}>
                      {ws.plan ?? 'free'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-[#111]">
                    {(ws.responses_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(ws.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Arrow className="w-4 h-4 text-gray-300 inline" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t-2 border-[#111] bg-[#FFFBF2]">
            <span className="text-xs font-bold text-gray-500" style={SG}>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border-2 border-[#111] bg-white hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border-2 border-[#111] bg-white hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
