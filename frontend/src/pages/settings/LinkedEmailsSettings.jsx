import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Mail, Loader, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LinkedEmailsSettings() {
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState('');

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['linked-emails'],
    queryFn: () => api.linkedEmails.list(),
  });

  const addMut = useMutation({
    mutationFn: () => api.linkedEmails.add(newEmail.trim()),
    onSuccess: () => {
      qc.invalidateQueries(['linked-emails']);
      toast.success('Email added');
      setNewEmail('');
    },
    onError: e => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id) => api.linkedEmails.remove(id),
    onSuccess: () => { qc.invalidateQueries(['linked-emails']); toast.success('Email removed'); },
    onError: e => toast.error(e.message),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    addMut.mutate();
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Linked Emails</h2>
      <p className="text-sm text-gray-500 mb-6">
        These email addresses receive submission notifications. Add team inboxes or personal addresses here.
      </p>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="email"
          className="input flex-1"
          placeholder="team@example.com"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
        />
        <button type="submit" disabled={!newEmail.trim() || addMut.isPending} className="btn-primary">
          {addMut.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add email
        </button>
      </form>

      {/* Email list */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader className="w-5 h-5 animate-spin text-gray-300" /></div>
      ) : emails.length === 0 ? (
        <div className="card p-10 text-center">
          <Mail className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No linked emails yet</p>
          <p className="text-xs text-gray-400 mt-1">Add an email above to receive form notifications.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 overflow-hidden">
          {emails.map(em => (
            <div key={em.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{em.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Added {new Date(em.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {em.verified && <span className="inline-flex items-center gap-1 ml-2 text-green-600"><CheckCircle className="w-3 h-3" /> Verified</span>}
                </p>
              </div>
              <button
                onClick={() => removeMut.mutate(em.id)}
                disabled={removeMut.isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Notification emails are sent from <span className="font-mono">noreply@formflowx.com</span>. Make sure to whitelist this address.
      </p>
    </div>
  );
}
