import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, X, ChevronLeft, ChevronRight, Search, CheckSquare, Square } from 'lucide-react';
import { api } from '@/lib/api';
import FormHeader from '@/components/builder/FormHeader';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const DISPLAYABLE = ['short_text','long_text','multiple_choice','dropdown','rating','nps','yes_no','date','time','phone','email','number','address','ranking'];

function formatAnswer(question, answer) {
  if (answer === undefined || answer === null || answer === '') return null;
  const choices = question.config?.choices ?? [];
  if (question.type === 'multiple_choice') {
    const ids = Array.isArray(answer) ? answer : [answer];
    return ids.map(id => choices.find(c => c.id === id)?.label ?? id).join(', ');
  }
  if (question.type === 'dropdown') {
    return choices.find(c => c.id === answer)?.label ?? answer;
  }
  if (question.type === 'yes_no') return answer;
  if (question.type === 'rating') return `${'★'.repeat(Number(answer))}${'☆'.repeat((question.config?.steps ?? 5) - Number(answer))}`;
  if (question.type === 'nps') return String(answer) + ' / 10';
  if (question.type === 'ranking') {
    const items = question.config?.items ?? [];
    if (Array.isArray(answer)) return answer.map(id => items.find(i => i.id === id)?.label ?? id).join(' → ');
  }
  return String(answer);
}

export default function ResponsesPage() {
  const { formId } = useParams();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [filter, setFilter] = useState('complete');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: formData } = useQuery({
    queryKey: ['form-meta', formId],
    queryFn: () => api.forms.get(formId),
    staleTime: 60_000,
  });

  const { data: respData, isLoading } = useQuery({
    queryKey: ['responses', formId, filter, page],
    queryFn: () => api.responses.list(formId, {
      partial: filter === 'partial' ? 'true' : filter === 'all' ? undefined : 'false',
      page,
      limit: 50,
    }),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (rid) => api.responses.delete(formId, rid),
    onSuccess: () => {
      toast.success('Response deleted');
      qc.invalidateQueries(['responses', formId]);
      setSelected(null);
    },
    onError: () => toast.error('Could not delete'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all([...ids].map(id => api.responses.delete(formId, id)));
    },
    onSuccess: () => {
      toast.success(`${checkedIds.size} response${checkedIds.size !== 1 ? 's' : ''} deleted`);
      setCheckedIds(new Set());
      qc.invalidateQueries(['responses', formId]);
    },
    onError: () => toast.error('Could not delete'),
  });

  const form = formData?.form;
  const questions = (form?.questions ?? [])
    .filter(q => DISPLAYABLE.includes(q.type))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const allResponses = respData?.responses ?? [];
  const total = respData?.total ?? 0;

  const responses = search
    ? allResponses.filter(r =>
        (r.respondent_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        Object.values(r.answers ?? {}).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : allResponses;

  const selectedResponse = responses.find(r => r.id === selected);

  return (
    <div className="h-screen flex flex-col bg-[#FFFBF2] overflow-hidden">
      <FormHeader staticTitle={form?.title} />

      <div className="flex-1 flex overflow-hidden">
        {/* Main table */}
        <div className={clsx('flex flex-col overflow-hidden transition-all', selected ? 'flex-1' : 'w-full')}>
          {/* Toolbar */}
          <div className="bg-white border-b-2 border-[#111] px-4 py-3 flex items-center gap-3 shrink-0">
            {/* Filter tabs */}
            <div className="flex gap-1">
              {[['complete', 'Complete'], ['partial', 'Partial'], ['all', 'All']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => { setFilter(v); setPage(1); setSelected(null); }}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs transition-all border-2',
                    filter === v
                      ? 'bg-[#111] text-white border-[#111]'
                      : 'border-transparent text-gray-500 hover:border-[#111] hover:text-[#111]'
                  )}
                  style={{ fontWeight: 700, ...SG }}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search responses…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border-2 border-[#111] rounded-lg focus:outline-none bg-white"
              />
            </div>

            <div className="flex-1" />

            {/* Bulk delete */}
            {checkedIds.size > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Delete ${checkedIds.size} selected response${checkedIds.size !== 1 ? 's' : ''}?`)) {
                    bulkDeleteMutation.mutate(checkedIds);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-red-400 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                style={SG}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {checkedIds.size}
              </button>
            )}

            {/* Stats */}
            <span className="text-xs text-gray-500 font-medium">
              {total} response{total !== 1 ? 's' : ''}
            </span>

            {/* Export */}
            <a
              href={api.responses.exportCsv(formId)}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#111] text-xs font-bold text-[#111] transition-all hover:-translate-y-px"
              style={{ ...SG, boxShadow: '2px 2px 0 #111' }}
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-5xl mb-4">📭</p>
                <p className="font-bold text-[#111] text-lg" style={SG}>No responses yet</p>
                <p className="text-sm text-gray-500 mt-1">Share your form to start collecting responses.</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-[#111]">
                    <th className="px-3 py-2.5 w-8">
                      <button
                        onClick={() => {
                          if (checkedIds.size === responses.length) {
                            setCheckedIds(new Set());
                          } else {
                            setCheckedIds(new Set(responses.map(r => r.id)));
                          }
                        }}
                        className="text-gray-400 hover:text-[#111] transition-colors"
                      >
                        {checkedIds.size === responses.length && responses.length > 0
                          ? <CheckSquare className="w-4 h-4 text-[#f97316]" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 whitespace-nowrap w-32" style={SG}>#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 whitespace-nowrap" style={SG}>Submitted</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 whitespace-nowrap" style={SG}>Respondent</th>
                    {questions.slice(0, selected ? 2 : 6).map(q => (
                      <th key={q.id} className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 max-w-[180px]" style={SG}>
                        <span className="block truncate">{q.title || 'Untitled'}</span>
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => {
                    const isSelected = r.id === selected;
                    const isChecked = checkedIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(isSelected ? null : r.id)}
                        className={clsx(
                          'border-b border-gray-100 cursor-pointer transition-colors',
                          isChecked ? 'bg-orange-50/60' : isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
                        )}
                      >
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setCheckedIds(prev => {
                              const next = new Set(prev);
                              next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                              return next;
                            })}
                            className="text-gray-400 hover:text-[#111] transition-colors"
                          >
                            {isChecked
                              ? <CheckSquare className="w-4 h-4 text-[#f97316]" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {r.is_partial && (
                            <span className="mr-1.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300">PARTIAL</span>
                          )}
                          {String(total - (page - 1) * 50 - i).padStart(3, '0')}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">
                          <span className="block truncate">{r.respondent_email ?? <span className="text-gray-400 italic">Anonymous</span>}</span>
                        </td>
                        {questions.slice(0, selected ? 2 : 6).map(q => {
                          const display = formatAnswer(q, r.answers?.[q.id]);
                          return (
                            <td key={q.id} className="px-4 py-3 text-xs text-gray-700 max-w-[180px]">
                              <span className="block truncate">{display ?? <span className="text-gray-300">—</span>}</span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); if (confirm('Delete this response?')) deleteMutation.mutate(r.id); }}
                            className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > 50 && (
            <div className="border-t-2 border-[#111] bg-white px-4 py-2.5 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 50)}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border-2 border-[#111] disabled:opacity-30 hover:bg-gray-50"
                  style={{ boxShadow: '2px 2px 0 #111' }}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
                  className="p-1.5 rounded-lg border-2 border-[#111] disabled:opacity-30 hover:bg-gray-50"
                  style={{ boxShadow: '2px 2px 0 #111' }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedResponse && (
          <ResponseDetail
            response={selectedResponse}
            questions={questions}
            allQuestions={form?.questions ?? []}
            onClose={() => setSelected(null)}
            onDelete={() => { deleteMutation.mutate(selectedResponse.id); }}
            deleting={deleteMutation.isPending}
            formatAnswer={formatAnswer}
          />
        )}
      </div>
    </div>
  );
}

function ResponseDetail({ response, questions, allQuestions, onClose, onDelete, deleting, formatAnswer }) {
  const answeredQuestions = allQuestions.filter(q =>
    DISPLAYABLE.includes(q.type) && response.answers?.[q.id] !== undefined && response.answers?.[q.id] !== null && response.answers?.[q.id] !== ''
  ).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <div className="w-80 bg-white border-l-2 border-[#111] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#111] shrink-0">
        <div>
          <p className="text-sm font-bold text-[#111]" style={SG}>Response detail</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {response.submitted_at ? new Date(response.submitted_at).toLocaleString() : 'Partial'}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0 space-y-1.5">
        {response.respondent_email && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20 shrink-0">Email</span>
            <span className="text-xs text-gray-700 truncate">{response.respondent_email}</span>
          </div>
        )}
        {response.completion_time_ms && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20 shrink-0">Time</span>
            <span className="text-xs text-gray-700">{Math.round(response.completion_time_ms / 1000)}s</span>
          </div>
        )}
        {response.utm_source && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20 shrink-0">Source</span>
            <span className="text-xs text-gray-700">{response.utm_source}</span>
          </div>
        )}
      </div>

      {/* Answers */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {answeredQuestions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No answers recorded</p>
        ) : (
          answeredQuestions.map(q => {
            const display = formatAnswer(q, response.answers[q.id]);
            return (
              <div key={q.id}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{q.title || 'Untitled'}</p>
                <p className="text-sm text-[#111] leading-relaxed break-words">{display}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t-2 border-[#111] shrink-0">
        <button
          onClick={onDelete}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-red-400 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
          style={SG}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? 'Deleting…' : 'Delete response'}
        </button>
      </div>
    </div>
  );
}
