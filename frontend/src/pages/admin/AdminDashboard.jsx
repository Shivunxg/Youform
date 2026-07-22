import { useQuery } from '@tanstack/react-query';
import { Users, Building2, FileText, Inbox } from 'lucide-react';
import { api } from '@/lib/api';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const PLAN_COLORS = {
  free:       { bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'Free' },
  pro:        { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Pro' },
  business:   { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Business' },
  enterprise: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Enterprise' },
};

function StatCard({ icon: Icon, label, value, color = '#f97316' }) {
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-5"
      style={{ boxShadow: '4px 4px 0 #111' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wide" style={SG}>{label}</span>
        <div className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center"
          style={{ background: color }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#111]" style={SG}>
        {value?.toLocaleString() ?? '—'}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.admin.stats(),
    refetchInterval: 60_000,
  });

  const totalPaid = (data?.plans?.pro ?? 0) + (data?.plans?.business ?? 0) + (data?.plans?.enterprise ?? 0);
  const totalWs = data?.totalWorkspaces ?? 0;
  const convRate = totalWs > 0 ? Math.round((totalPaid / totalWs) * 100) : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111]" style={SG}>Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1" style={SG}>Platform-wide overview</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border-2 border-[#111] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users}     label="Total users"      value={data?.totalUsers}      color="#111" />
            <StatCard icon={Building2} label="Workspaces"       value={data?.totalWorkspaces} color="#f97316" />
            <StatCard icon={FileText}  label="Forms created"    value={data?.totalForms}      color="#6366f1" />
            <StatCard icon={Inbox}     label="Total responses"  value={data?.totalResponses}  color="#10b981" />
          </div>

          {/* Plan distribution */}
          <div className="bg-white rounded-xl border-2 border-[#111] p-6" style={{ boxShadow: '4px 4px 0 #111' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#111]" style={SG}>Plan distribution</h2>
              <span className="text-sm font-bold text-gray-400" style={SG}>
                {convRate}% paid conversion
              </span>
            </div>
            <div className="space-y-3">
              {Object.entries(data?.plans ?? {}).map(([plan, count]) => {
                const c = PLAN_COLORS[plan] ?? PLAN_COLORS.free;
                const pct = totalWs > 0 ? Math.round((count / totalWs) * 100) : 0;
                return (
                  <div key={plan} className="flex items-center gap-3">
                    <span className={`w-20 text-xs font-bold px-2 py-0.5 rounded-full text-center ${c.bg} ${c.text}`} style={SG}>
                      {c.label}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: plan === 'free' ? '#d1d5db' : plan === 'pro' ? '#3b82f6' : plan === 'business' ? '#8b5cf6' : '#f97316' }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm font-bold text-[#111]" style={SG}>
                      {count.toLocaleString()} <span className="text-gray-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
