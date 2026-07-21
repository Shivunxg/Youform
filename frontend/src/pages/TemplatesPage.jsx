import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import AppShell from '@/components/ui/AppShell';
import toast from 'react-hot-toast';
export default function TemplatesPage() {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data } = useQuery({ queryKey: ['templates'], queryFn: () => api.templates.list() });
  const useMut = useMutation({
    mutationFn: (templateId) => api.forms.create(activeWorkspaceId, { templateId }),
    onSuccess: ({ form }) => { toast.success('Form created!'); navigate(`/forms/${form.id}/builder`); },
    onError: () => toast.error('Could not create form'),
  });
  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Templates</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div onClick={() => useMut.mutate(undefined)} className="card p-5 border-2 border-dashed border-gray-200 hover:border-brand-300 cursor-pointer flex flex-col items-center justify-center text-center py-10">
            <p className="font-medium text-gray-800 text-sm">Start blank</p><p className="text-xs text-gray-400 mt-1">Build from scratch</p>
          </div>
          {(data?.templates ?? []).map(tpl => (
            <div key={tpl.id} className="card p-5 hover:shadow-md transition-shadow">
              <h3 className="font-medium text-gray-900 text-sm">{tpl.title}</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">{tpl.description}</p>
              <button onClick={() => useMut.mutate(tpl.id)} disabled={useMut.isPending} className="btn-primary text-xs py-1.5">Use template</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
