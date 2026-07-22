import { useQuery } from '@tanstack/react-query';
import { Users, Building2, FileText, Inbox, TrendingUp, DollarSign, CheckCircle, Activity } from 'lucide-react';
import { api } from '@/lib/api';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const PLAN_COLORS = {
  free:       { bg: 'bg-gray-100',   text: 'text-gray-700',   bar: '#d1d5db', label: 'Free' },
  pro:        { bg: 'bg-blue-100',   text: 'text-blue-700',   bar: '#3b82f6', label: 'Pro' },
  business:   { bg: 'bg-purple-100', text: 'text-purple-700', bar: '#8b5cf6', label: 'Business' },
  enterprise: { bg: 'bg-orange-100', text: 'text-orange-700', bar: '#f97316', label: 'Enterprise' },
};

function StatCard({ icon: Icon, label, value, color = '#f97316', sub }) {
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-5"
      style={{ boxShadow: '4px 4px 0 #111' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={SG}>{label}</span>
        <div className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center"
          style={{ background: color }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#111]" style={SG}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1 font-medium" style={SG}>{sub}</p>}
    </div>
  );
}

function FinanceCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-5 flex flex-col gap-1"
      style={{ boxShadow: '4px 4px 0 #111' }}>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={SG}>{label}</span>
      <p className="text-2xl font-bold mt-1" style={{ ...SG, color: accent ?? '#111' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 font-medium" style={SG}>{sub}</p>}
    </div>
  );
}

function fmt(n) { return (n ?? 0).toLocaleString(); }
function fmtMoney(n) {
  if (!n) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.admin.stats(),
    refetchInterval: 60_000,
  });

  const totalPaid = data?.paidWorkspaces ?? 0;
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
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border-2 border-[#111] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Usage metrics */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <StatCard icon={Users}     label="Total users"      value={fmt(data?.totalUsers)}      color="#111" />
            <StatCard icon={Building2} label="Workspaces"       value={fmt(data?.totalWorkspaces)} color="#f97316" />
            <StatCard icon={FileText}  label="Forms created"    value={fmt(data?.totalForms)}      color="#6366f1" />
            <StatCard icon={Inbox}     label="Total responses"  value={fmt(data?.totalResponses)}  color="#10b981" />
          </div>

          {/* Financial metrics */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <FinanceCard
              label="MRR (est.)"
              value={fmtMoney(data?.mrr)}
              sub="Monthly recurring revenue"
              accent="#10b981"
            />
            <FinanceCard
              label="ARR (est.)"
              value={fmtMoney(data?.arr)}
              sub="Annualised recurring revenue"
              accent="#6366f1"
            />
            <FinanceCard
              label="Paid workspaces"
              value={fmt(data?.paidWorkspaces)}
              sub={`${convRate}% conversion rate`}
              accent="#f97316"
            />
            <FinanceCard
              label="Active this month"
              value={fmt(data?.activeWorkspaces)}
              sub="Workspaces with ≥1 response"
              accent="#3b82f6"
            />
          </div>

          {/* Plan distribution */}
          <div className="bg-white rounded-xl border-2 border-[#111] p-6" style={{ boxShadow: '4px 4px 0 #111' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#111]" style={SG}>Plan distribution</h2>
              <div className="flex items-center gap-4 text-sm font-bold text-gray-500" style={SG}>
                <span>{fmt(data?.freeWorkspaces)} free</span>
                <span className="text-[#f97316]">{fmt(data?.paidWorkspaces)} paid</span>
              </div>
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
                        style={{ width: `${pct}%`, background: c.bar }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-bold text-[#111]" style={{ ...SG, fontVariantNumeric: 'tabular-nums' }}>
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
