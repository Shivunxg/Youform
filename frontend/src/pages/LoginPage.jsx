import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuthStore();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signIn({ email, password }); navigate('/dashboard'); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-5 group">
            <div className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center" style={{background:'#111',boxShadow:'2px 2px 0 #f97316'}}><span className="text-white font-bold text-sm" style={{fontFamily:'Space Grotesk,sans-serif'}}>F</span></div>
            <span className="text-xl font-display font-bold text-ink">FormFlow</span>
          </a>
          <h1 className="text-2xl font-display font-bold text-ink">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>
        <div className="card p-6">
          <button onClick={signInWithGoogle} className="btn-secondary w-full justify-center mb-4">Continue with Google</button>
          <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div><div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">or</div></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">No account? <Link to="/signup" className="text-brand-500 font-medium">Sign up free</Link></p>
        <p className="text-center mt-3"><a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back to homepage</a></p>
      </div>
    </div>
  );
}
