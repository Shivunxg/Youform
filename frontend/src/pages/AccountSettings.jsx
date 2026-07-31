import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const TIMEZONES = [
  'Asia/Calcutta', 'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
];

export default function AccountSettings() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', timezone: 'Asia/Calcutta' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.account.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formflowx-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Your data has been downloaded.');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.account.delete();
      await signOut();
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Deletion failed. Please try again.');
      setDeleting(false);
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
                To change your password, log out and use "Reset password" on the login page.
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

        {/* Data & Privacy */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Data & Privacy</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Export your data</p>
              <p className="text-xs text-gray-500">Download a JSON file of your account, workspaces, and forms.</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn btn-secondary text-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting…' : 'Export data'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            <a href="/privacy" target="_blank" className="underline hover:text-gray-600">Privacy Policy</a>
            {' — '}your data is processed in compliance with GDPR. You may request erasure at any time using the button below.
          </p>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6 mt-4">
          <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Delete account</p>
              <p className="text-xs text-gray-500">Permanently deletes your account and all data. Cannot be undone.</p>
            </div>
            <button
              onClick={() => setDeleteModal(true)}
              className="btn-danger text-sm flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border-2 border-red-400 p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete account permanently?</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will delete your profile, all workspaces you solely own, all their forms, and all response data. This action <strong>cannot be undone</strong>.
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Type <span className="font-mono text-red-600">DELETE</span> to confirm
            </label>
            <input
              className="input mb-4"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteModal(false); setDeleteConfirm(''); }}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
