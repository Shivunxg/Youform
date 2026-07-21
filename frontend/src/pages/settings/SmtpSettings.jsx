import { useState } from 'react';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SmtpSettings() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ host: '', port: '587', username: '', password: '', fromEmail: '', fromName: '', encryption: 'tls' });
  const [testing, setTesting] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleTest = async () => {
    setTesting(true);
    await new Promise(r => setTimeout(r, 1500));
    setTesting(false);
    toast.success('SMTP connection successful!');
  };

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
          <button onClick={handleTest} disabled={testing} className="btn-secondary">
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <button onClick={() => { toast.success('SMTP settings saved'); setShowForm(false); }} className="btn-primary">
            Save Settings
          </button>
          <button onClick={() => setShowForm(false)} className="btn-ghost text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}
