import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const TIMEZONES = [
  'Asia/Calcutta', 'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
];

export default function AccountSettings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', timezone: 'Asia/Calcutta' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name ?? '';
      const parts = name.split(' ');
      setForm(f => ({
        ...f,
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' ') ?? '',
      }));
    }
  }, [user]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: `${form.firstName} ${form.lastName}`.trim() },
      });
      if (error) throw error;
      toast.success('Account updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Account</h1>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <input className="input" value={form.firstName} onChange={set('firstName')} placeholder="First name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input className="input" value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input className="input bg-gray-50 text-gray-500" value={user?.email ?? ''} readOnly />
              <p className="text-xs text-gray-400 mt-1.5">
                If you want to change your password then please logout and then "reset password" from login page.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
              <div className="relative">
                <select className="input pr-24" value={form.timezone} onChange={set('timezone')}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: form.timezone })}
                </span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 mt-4">
          <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Delete account</p>
              <p className="text-xs text-gray-500">This will permanently delete your account and all data.</p>
            </div>
            <button className="btn-danger text-sm">Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
