import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const EMPTY = { host: '', port: '587', username: '', password: '', fromEmail: '', fromName: '', encryption: 'tls' };

export default function SmtpSettings() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { data, isLoading } = useQuery({
    queryKey: ['smtp', activeWorkspaceId],
    queryFn: () => api.workspaces.smtp(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  useEffect(() => {
    if (data?.smtp_settings) {
      setForm({ ...EMPTY, ...data.smtp_settings });
      setShowForm(true);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.workspaces.saveSmtp(activeWorkspaceId, { smtp_settings: form }),
    onSuccess: () => { toast.success('SMTP settings saved'); setShowForm(false); },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => api.workspaces.testSmtp(activeWorkspaceId, form),
    onSuccess: () => toast.success('SMTP connection successful!'),
    onError: (err) => toast.error(`Connection failed: ${err.message}`),
  });

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>;

  if (!showForm) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">SMTP Settings</h1>
        <p className="text-sm text-gray-500 mb-8">Enter your SMTP settings to send emails to your respondents using your own email address.</p>
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700 mb-1">No SMTP settings</p>
          <p className="text-sm text-gray-400 mb-5">Get started by creating your first SMTP configuration.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add SMTP Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">SMTP Settings</h1>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input className="input" placeholder="smtp.gmail.com" value={form.host} onChange={set('host')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input className="input" placeholder="587" value={form.port} onChange={set('port')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input className="input" placeholder="you@gmail.com" value={form.username} onChange={set('username')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" className="input" placeholder="••••••••" value={form.password} onChange={set('password')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input className="input" placeholder="noreply@yourcompany.com" value={form.fromEmail} onChange={set('fromEmail')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input className="input" placeholder="Your Company" value={form.fromName} onChange={set('fromName')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
          <select className="input" value={form.encryption} onChange={set('encryption')}>
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending || !form.host} className="btn-secondary">
            {testMutation.isPending ? 'Testing…' : 'Test Connection'}
          </button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.host} className="btn-primary">
            {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
          <button onClick={() => setShowForm(false)} className="btn-ghost text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}
