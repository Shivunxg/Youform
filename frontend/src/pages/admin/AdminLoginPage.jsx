import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

export default function AdminLoginPage() {
  const { signIn, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });

      // Verify platform admin flag
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
            <p className="text-white font-bold text-xl leading-none" style={SG}>Youform</p>
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
        </div>

        <p className="text-center mt-6 text-sm text-gray-500" style={SG}>
          <a href="/dashboard" className="text-[#f97316] hover:underline font-bold">← Back to app</a>
        </p>
      </div>
    </div>
  );
}
