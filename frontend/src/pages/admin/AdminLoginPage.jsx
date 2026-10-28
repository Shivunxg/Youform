import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

function useSystemHealth() {
  const [health, setHealth] = useState({ status: 'checking', db: 'checking', dbLatencyMs: null, uptimeMs: null, apiLatencyMs: null });

  useEffect(() => {
    const check = async () => {
      const t = Date.now();
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(6000) });
        const data = await res.json();
        setHealth({
          status:       data.status ?? (res.ok ? 'ok' : 'down'),
          db:           data.db ?? (res.ok ? 'ok' : 'down'),
          dbLatencyMs:  data.dbLatencyMs ?? null,
          uptimeMs:     data.uptimeMs ?? null,
          apiLatencyMs: Date.now() - t,
        });
      } catch {
        setHealth({ status: 'down', db: 'down', dbLatencyMs: null, uptimeMs: null, apiLatencyMs: Date.now() - t });
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  return health;
}

function formatUptime(ms) {
  if (ms == null) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function StatusDot({ status }) {
  const color = status === 'ok' ? '#22c55e' : status === 'checking' ? '#94a3b8' : '#ef4444';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: status === 'ok' ? `0 0 0 2px #22c55e33` : status === 'down' ? `0 0 0 2px #ef444433` : 'none',
        flexShrink: 0,
      }}
    />
  );
}

function HealthBar({ health }) {
  const overallOk = health.status === 'ok';
  const overallChecking = health.status === 'checking';

  const barBg    = overallChecking ? '#f8fafc' : overallOk ? '#f0fdf4' : '#fef2f2';
  const barBorder= overallChecking ? '#e2e8f0' : overallOk ? '#bbf7d0' : '#fecaca';
  const labelClr = overallChecking ? '#94a3b8'  : overallOk ? '#15803d' : '#b91c1c';
  const overallLabel = overallChecking ? 'Checking…' : overallOk ? 'All systems operational' : 'Service disruption';

  const indicators = [
    {
      key: 'api',
      label: 'API',
      status: health.status,
      value: health.apiLatencyMs != null ? `${health.apiLatencyMs}ms` : '—',
    },
    {
      key: 'db',
      label: 'Database',
      status: health.db,
      value: health.dbLatencyMs != null ? `${health.dbLatencyMs}ms` : '—',
    },
    {
      key: 'uptime',
      label: 'Uptime',
      status: health.status === 'checking' ? 'checking' : 'ok',
      value: formatUptime(health.uptimeMs),
    },
  ];

  return (
    <div
      className="rounded-xl border-2 overflow-hidden mt-5"
      style={{ borderColor: barBorder, background: barBg }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: barBorder }}
      >
        <div className="flex items-center gap-2">
          <StatusDot status={health.status} />
          <span className="text-xs font-bold" style={{ ...SG, color: labelClr }}>{overallLabel}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ ...SG, color: labelClr, opacity: 0.5 }}>
          System Health
        </span>
      </div>

      {/* 3-indicator bar */}
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: barBorder }}>
        {indicators.map(ind => (
          <div key={ind.key} className="flex flex-col items-center py-3 px-2 gap-1.5">
            <StatusDot status={ind.status} />
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ ...SG, color: labelClr, opacity: 0.55 }}>
              {ind.label}
            </span>
            <span className="text-xs font-bold" style={{ ...SG, color: labelClr }}>
              {ind.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  const { signIn, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const health = useSystemHealth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });

      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('id', session?.user?.id)
        .single();

      if (!profile?.is_platform_admin) {
        await signOut();
        setError('This account does not have admin access.');
        return;
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl border-2 border-[#f97316] flex items-center justify-center"
            style={{ background: '#f97316' }}>
            <span className="text-white font-bold text-lg" style={SG}>F</span>
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-none" style={SG}>FormflowX</p>
            <p className="text-[#f97316] text-xs font-bold tracking-widest uppercase" style={SG}>Admin Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-[#f97316] p-8"
          style={{ boxShadow: '6px 6px 0 #f97316' }}>
          <h1 className="text-xl font-bold text-[#111] mb-6" style={SG}>Sign in to admin</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-400 rounded-lg text-red-700 text-sm font-bold" style={SG}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#111] mb-1.5 uppercase tracking-wide" style={SG}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] outline-none focus:border-[#f97316] transition-colors"
                style={SG}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111] mb-1.5 uppercase tracking-wide" style={SG}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border-2 border-[#111] rounded-lg text-sm font-bold text-[#111] outline-none focus:border-[#f97316] transition-colors"
                style={SG}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#f97316] text-white font-bold text-sm rounded-lg border-2 border-[#111] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ ...SG, boxShadow: '3px 3px 0 #111' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* System health bar — inside the card */}
          <HealthBar health={health} />
        </div>

        <p className="text-center mt-6 text-sm text-gray-500" style={SG}>
          <a href="/dashboard" className="text-[#f97316] hover:underline font-bold">← Back to app</a>
        </p>
      </div>
    </div>
  );
}
