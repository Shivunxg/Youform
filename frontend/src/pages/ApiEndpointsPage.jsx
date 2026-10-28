import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Code2, Plus, Trash2, Copy, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import AppShell from '@/components/ui/AppShell';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.formflowx.com';

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy}
      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors flex items-center gap-1.5">
      <Copy className="w-3 h-3" />
      {copied ? 'Copied!' : label}
    </button>
  );
}

function SubmissionsPanel({ endpointId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['endpoint-submissions', endpointId],
    queryFn: () => api.endpoints.submissions(endpointId, { limit: 50 }),
  });

  const subs = data?.submissions ?? [];

  if (isLoading) return <div className="py-6 text-center text-sm text-gray-400">Loading…</div>;
  if (!subs.length) return <div className="py-6 text-center text-sm text-gray-400">No submissions yet.</div>;

  const allKeys = [...new Set(subs.flatMap(s => Object.keys(s.data || {})))];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {allKeys.map(k => (
              <th key={k} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{k}</th>
            ))}
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Origin</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
          </tr>
        </thead>
        <tbody>
          {subs.map(s => (
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
              {allKeys.map(k => (
                <td key={k} className="px-3 py-2.5 text-gray-700 max-w-[200px] truncate">{String(s.data?.[k] ?? '—')}</td>
              ))}
              <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                {s.origin ? (() => { try { return new URL(s.origin).hostname; } catch { return s.origin; } })() : '—'}
              </td>
              <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                {new Date(s.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({ ep }) {
  const qc = useQueryClient();
  const [showSubs, setShowSubs] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => api.endpoints.delete(ep.id),
    onSuccess: () => { qc.invalidateQueries(['endpoints']); toast.success('Endpoint deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (active) => api.endpoints.update(ep.id, { active }),
    onSuccess: () => qc.invalidateQueries(['endpoints']),
    onError: (e) => toast.error(e.message),
  });

  const snippet = `<form action="${API_BASE}/submit" method="POST">
  <input type="hidden" name="access_key" value="${ep.access_key}">

  <input type="text" name="name" placeholder="Your name" required>
  <input type="email" name="email" placeholder="Email" required>
  <textarea name="message" placeholder="Message" required></textarea>

  <!-- Optional: redirect after submit -->
  <!-- <input type="hidden" name="_redirect" value="https://yoursite.com/thanks"> -->

  <button type="submit">Send</button>
</form>`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={clsx('w-2 h-2 rounded-full shrink-0', ep.active ? 'bg-green-500' : 'bg-gray-300')} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{ep.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Notify → {ep.email_to || '(none)'} · Created {new Date(ep.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleMut.mutate(!ep.active)}
            disabled={toggleMut.isPending}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {ep.active
              ? <ToggleRight className="w-5 h-5 text-green-500" />
              : <ToggleLeft className="w-5 h-5 text-gray-300" />}
            {ep.active ? 'Active' : 'Disabled'}
          </button>
          <button
            onClick={() => { if (confirm('Delete this endpoint and all its submissions?')) deleteMut.mutate(); }}
            disabled={deleteMut.isPending}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Access key */}
      <div className="px-5 pb-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Access key</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 truncate">
            {ep.access_key}
          </code>
          <CopyButton text={ep.access_key} label="Copy key" />
        </div>
      </div>

      {/* Snippet toggle */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowSnippet(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2"><Code2 className="w-4 h-4" /> HTML snippet</span>
          {showSnippet ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {showSnippet && (
          <div className="px-5 pb-4">
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                {snippet}
              </pre>
              <div className="absolute top-3 right-3">
                <CopyButton text={snippet} label="Copy" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submissions toggle */}
      <button
        onClick={() => setShowSubs(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span>View submissions</span>
        {showSubs ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {showSubs && (
        <div className="border-t border-gray-100 px-2 pb-2">
          <SubmissionsPanel endpointId={ep.id} />
        </div>
      )}
    </div>
  );
}

function CreateForm({ onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: () => api.endpoints.create({ name: name.trim(), email_to: email.trim() }),
    onSuccess: () => {
      qc.invalidateQueries(['endpoints']);
      toast.success('Endpoint created');
      setName(''); setEmail(''); setOpen(false);
      onCreated?.();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" /> New endpoint
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-800 mb-4">New endpoint</p>
      <div className="flex gap-3 flex-wrap">
        <input
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
          placeholder="Form name (e.g. Contact form)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createMut.mutate()}
          autoFocus
        />
        <input
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
          placeholder="Notify email (optional)"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createMut.mutate()}
        />
        <div className="flex gap-2">
          <button
            onClick={() => createMut.mutate()}
            disabled={!name.trim() || createMut.isPending}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {createMut.isPending && <Loader className="w-3.5 h-3.5 animate-spin" />}
            Create
          </button>
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApiEndpointsPage() {
  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ['endpoints'],
    queryFn: () => api.endpoints.list(),
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">API Endpoints</h1>
            <p className="text-sm text-gray-500 mt-1">
              Point any HTML form here — FormFlowX stores submissions and emails you. No backend needed.
            </p>
          </div>
          <CreateForm />
        </div>

        {/* How it works banner */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-brand-700 mb-1">How it works</p>
          <p className="text-sm text-brand-600">
            Create an endpoint → get an access key → add it as a hidden field in any HTML form → submissions are stored here and emailed to you.
          </p>
          <code className="mt-2 block text-xs font-mono text-brand-700 bg-brand-100 rounded-lg px-3 py-2">
            {'<input type="hidden" name="access_key" value="YOUR_KEY">'}
          </code>
        </div>

        {/* Endpoints */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Code2 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No endpoints yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one above to get your access key.</p>
          </div>
        ) : (
          <div className="flex flex-direction-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {endpoints.map(ep => <EndpointCard key={ep.id} ep={ep} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
