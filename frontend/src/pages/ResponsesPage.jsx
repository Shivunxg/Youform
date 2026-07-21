import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
import { api } from '@/lib/api';
import AppShell from '@/components/ui/AppShell';
export default function ResponsesPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { data: formData } = useQuery({ queryKey: ['form', formId], queryFn: () => api.forms.get(formId) });
  const { data, isLoading } = useQuery({ queryKey: ['responses', formId], queryFn: () => api.responses.list(formId) });
  const form = formData?.form;
  const responses = data?.responses ?? [];
  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex-1"><h1 className="text-xl font-semibold">{form?.title ?? 'Responses'}</h1><p className="text-sm text-gray-500">{responses.length} responses</p></div>
          <a href={api.responses.exportCsv(formId)} className="btn-secondary" download><Download className="w-4 h-4" />Export CSV</a>
        </div>
        {isLoading ? <p className="text-gray-400">Loading...</p> : responses.length === 0 ? (
          <div className="card p-16 text-center"><p className="text-4xl mb-3">📭</p><p className="font-medium text-gray-700">No responses yet</p></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">#</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Submitted</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Respondent</th>
              </tr></thead>
              <tbody>{responses.map((r, i) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.respondent_email ?? 'Anonymous'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
