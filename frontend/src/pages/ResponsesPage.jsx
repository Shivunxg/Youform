import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, MailX } from 'lucide-react';
import { api } from '@/lib/api';
import AppShell from '@/components/ui/AppShell';

function downloadCsv(responses, formTitle) {
  if (!responses.length) return;
  const allKeys = [...new Set(responses.flatMap(r => Object.keys(r.answers ?? {})))];
  const header = ['#', 'Submitted At', 'Respondent', ...allKeys];
  const rows = responses.map((r, i) => [
    i + 1,
    r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '',
    r.respondent_email ?? 'Anonymous',
    ...allKeys.map(k => {
      const v = r.answers?.[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v).replace(/"/g, '""');
    }),
  ]);
  const csv = [header, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formTitle ?? 'responses'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResponsesPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { data: formData } = useQuery({ queryKey: ['form', formId], queryFn: () => api.forms.get(formId) });
  const { data, isLoading } = useQuery({ queryKey: ['responses', formId], queryFn: () => api.responses.list(formId) });
  const form = formData?.form;
  const responses = data?.responses ?? [];

  const allKeys = [...new Set(responses.flatMap(r => Object.keys(r.answers ?? {})))];

  return (
    <AppShell>
      <div className="p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{form?.title ?? 'Responses'}</h1>
            <p className="text-sm text-gray-500">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => downloadCsv(responses, form?.title)}
            disabled={!responses.length}
            className="btn-secondary disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : responses.length === 0 ? (
          <div className="card p-16 text-center">
            <MailX size={40} className="mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="font-medium text-gray-700">No responses yet</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">#</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Submitted</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">Respondent</th>
                  {allKeys.map(k => (
                    <th key={k} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap capitalize">{k.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((r, i) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.respondent_email ?? 'Anonymous'}</td>
                    {allKeys.map(k => {
                      const v = r.answers?.[k];
                      const display = v === undefined || v === null ? '—'
                        : typeof v === 'object' ? JSON.stringify(v)
                        : String(v);
                      return <td key={k} className="px-4 py-3 text-gray-700 text-xs max-w-[200px] truncate">{display}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
