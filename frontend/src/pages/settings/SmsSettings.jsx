import { useState } from 'react';
import { Smartphone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SmsSettings() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ accountSid: '', authToken: '', fromNumber: '' });
  const [isPro] = useState(false); // Check plan
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (!isPro) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">SMS Provider</h1>
        <p className="text-sm text-gray-500 mb-8">Configure your SMS provider to enable phone number verification on your forms.</p>
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-base font-semibold text-gray-700 mb-1">Business feature</p>
          <p className="text-sm text-gray-400 mb-5">SMS verification is available on the Business plan.</p>
          <a href="/settings/billing" className="btn-primary">Upgrade to Business</a>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-1">SMS Provider</h1>
        <p className="text-sm text-gray-500 mb-8">Configure your SMS provider to enable phone number verification on your forms.</p>
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Smartphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-700 mb-1">No SMS providers</p>
          <p className="text-sm text-gray-400 mb-5">Get started by adding your Twilio credentials.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Add SMS Provider</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">SMS Provider — Twilio</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
          <input className="input" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={form.accountSid} onChange={set('accountSid')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
          <input type="password" className="input" placeholder="••••••••••••••••" value={form.authToken} onChange={set('authToken')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Number</label>
          <input className="input" placeholder="+1234567890" value={form.fromNumber} onChange={set('fromNumber')} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => { toast.success('SMS provider saved'); setShowForm(false); }} className="btn-primary">Save</button>
          <button onClick={() => setShowForm(false)} className="btn-ghost text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  );
}
