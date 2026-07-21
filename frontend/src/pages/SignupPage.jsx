import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
export default function SignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await signUp({ email: form.email, password: form.password, fullName: form.fullName }); toast.success('Account created!'); navigate('/dashboard'); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/marketing" className="inline-flex items-center gap-2 mb-4 group"><div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center group-hover:bg-brand-600 transition-colors"><span className="text-white font-bold text-sm">F</span></div><span className="text-xl font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">FormFlow</span></a>
          <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Free forever. No credit card required.</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full name</label><input type="text" required value={form.fullName} onChange={set('fullName')} className="input" placeholder="Your name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" required value={form.email} onChange={set('email')} className="input" placeholder="you@example.com" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" required minLength={8} value={form.password} onChange={set('password')} className="input" placeholder="Min. 8 characters" /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">{loading ? 'Creating account…' : 'Create free account'}</button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link to="/login" className="text-brand-500 font-medium">Sign in</Link></p>
        <p className="text-center mt-3"><a href="/marketing" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back to homepage</a></p>
      </div>
    </div>
  );
}
