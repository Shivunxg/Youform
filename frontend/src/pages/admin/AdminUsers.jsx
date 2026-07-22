import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () => api.admin.users({ search: debouncedSearch || undefined, page, limit: 25 }),
  });

  const toggleAdmin = useMutation({
    mutationFn: ({ userId, current }) => api.admin.toggleAdmin(userId, !current),
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

      {/* Table */}
      <div className="bg-white rounded-xl border-2 border-[#111] overflow-hidden" style={{ boxShadow: '4px 4px 0 #111' }}>
        <table className="w-full text-sm" style={SG}>
          <thead>
            <tr className="border-b-2 border-[#111] bg-[#FFFBF2]">
              <th className="text-left px-5 py-3 font-bold text-[#111]">Email</th>
              <th className="text-left px-5 py-3 font-bold text-[#111]">Name</th>
              <th className="text-left px-5 py-3 font-bold text-[#111]">Joined</th>
              <th className="text-center px-5 py-3 font-bold text-[#111]">Admin</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td colSpan={5} className="px-5 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : data?.users?.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 font-bold">No users found</td></tr>
            ) : (
              data?.users?.map(user => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-[#FFFBF2] transition-colors">
                  <td className="px-5 py-3.5 font-bold text-[#111]">{user.email}</td>
                  <td className="px-5 py-3.5 text-gray-600">{user.full_name || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-5 py-3.5 text-center">
                    {user.is_platform_admin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => toggleAdmin.mutate({ userId: user.id, current: user.is_platform_admin })}
                      disabled={toggleAdmin.isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold transition-all hover:-translate-y-px disabled:opacity-50 ${
                        user.is_platform_admin
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-white text-[#111] hover:bg-[#FFFBF2]'
                      }`}
                      style={{ boxShadow: '2px 2px 0 #111' }}
                    >
                      {user.is_platform_admin
                        ? <><ShieldOff className="w-3 h-3" /> Revoke admin</>
                        : <><Shield className="w-3 h-3" /> Make admin</>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t-2 border-[#111] bg-[#FFFBF2]">
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
