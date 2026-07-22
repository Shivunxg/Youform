import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import FormHeader from '@/components/builder/FormHeader';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

function KPI({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-5" style={{ boxShadow: '4px 4px 0 #111' }}>
      <p className="text-3xl font-bold text-[#111]" style={SG}>{value ?? '—'}</p>
      <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function DropoffBar({ title, answered, total, index }) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold text-gray-400 w-5 text-right shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-[#111] truncate mr-4">{title || 'Untitled'}</p>
          <span className="text-xs font-bold text-gray-500 shrink-0">{answered} <span className="text-gray-300">/ {total}</span></span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct > 70 ? '#22c55e' : pct > 40 ? '#f97316' : '#ef4444' }}
          />
        </div>
      </div>
      <span className="text-xs font-bold w-9 text-right shrink-0" style={{ color: pct > 70 ? '#16a34a' : pct > 40 ? '#ea580c' : '#dc2626' }}>
        {pct}%
      </span>
    </div>
  );
}

function ChoiceBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-[#111] w-32 truncate shrink-0">{label}</p>
      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden border border-gray-200">
        <div className="h-full bg-[#f97316] rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-12 text-right shrink-0">{pct}% <span className="text-gray-400 font-normal">({count})</span></span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { formId } = useParams();

  const { data: formData } = useQuery({
    queryKey: ['form-meta', formId],
    queryFn: () => api.forms.get(formId),
    staleTime: 60_000,
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', formId],
    queryFn: () => api.responses.analytics(formId),
    staleTime: 60_000,
  });

  const form = formData?.form;

  // Build answer distribution per choice question from question_stats
  const choiceQuestions = (form?.questions ?? []).filter(q =>
    ['multiple_choice', 'dropdown', 'yes_no', 'rating', 'nps'].includes(q.type)
  );

  const avgTime = analytics?.avg_completion_seconds
    ? analytics.avg_completion_seconds >= 60
      ? `${Math.floor(analytics.avg_completion_seconds / 60)}m ${analytics.avg_completion_seconds % 60}s`
      : `${analytics.avg_completion_seconds}s`
    : null;

  return (
    <div className="h-screen flex flex-col bg-[#FFFBF2] overflow-hidden">
      <FormHeader staticTitle={form?.title} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#111]" style={SG}>Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Response rates, drop-off, and answer breakdowns.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <KPI label="Views" value={analytics?.views?.toLocaleString()} />
                <KPI label="Starts" value={analytics?.starts?.toLocaleString()} />
                <KPI label="Completions" value={analytics?.completions?.toLocaleString()} />
                <KPI label="Completion rate" value={analytics ? `${analytics.completion_rate}%` : null}
                  sub={avgTime ? `Avg time ${avgTime}` : null} />
              </div>

              {analytics?.partial > 0 && (
                <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800" style={SG}>{analytics.partial} partial submission{analytics.partial !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-amber-600">Respondents who started but didn't finish.</p>
                  </div>
                </div>
              )}

              {/* Drop-off funnel */}
              {(analytics?.question_stats?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border-2 border-[#111] p-6 mb-6" style={{ boxShadow: '4px 4px 0 #111' }}>
                  <h2 className="text-sm font-bold text-[#111] mb-5" style={SG}>Question drop-off</h2>
                  <div className="space-y-4">
                    {analytics.question_stats
                      .filter(s => !['welcome_screen','thank_you_screen','statement'].includes(
                        (form?.questions ?? []).find(q => q.id === s.question_id)?.type
                      ))
                      .map((s, i) => (
                        <DropoffBar
                          key={s.question_id}
                          title={s.title}
                          answered={s.answered}
                          total={analytics.completions + analytics.partial}
                          index={i}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Answer distributions for choice questions */}
              {choiceQuestions.map(q => {
                const stat = (analytics?.question_stats ?? []).find(s => s.question_id === q.id);
                if (!stat || stat.answered === 0) return null;

                if (q.type === 'yes_no') {
                  return (
                    <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                      choices={[{ id: 'Yes', label: 'Yes' }, { id: 'No', label: 'No' }]}
                      total={stat.answered} />
                  );
                }
                if (q.type === 'rating') {
                  const steps = q.config?.steps ?? 5;
                  return (
                    <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                      choices={[...Array(steps)].map((_, i) => ({ id: String(i + 1), label: `${i + 1} ${'★'.repeat(i + 1)}` }))}
                      total={stat.answered} />
                  );
                }
                if (q.type === 'nps') {
                  return (
                    <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                      choices={[...Array(11)].map((_, i) => ({ id: String(i), label: String(i) }))}
                      total={stat.answered} />
                  );
                }
                const choices = q.config?.choices ?? [];
                if (choices.length === 0) return null;
                return (
                  <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                    choices={choices} total={stat.answered} />
                );
              })}

              {!analytics || (analytics.views === 0 && analytics.starts === 0) && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📊</p>
                  <p className="font-bold text-[#111]" style={SG}>No data yet</p>
                  <p className="text-sm text-gray-500 mt-1">Share your form to start collecting analytics.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceDistribution({ title, q, stat, choices }) {
  const distribution = stat.distribution ?? {};
  const maxCount = Math.max(...choices.map(c => distribution[c.id] ?? 0), 1);
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-6 mb-4" style={{ boxShadow: '4px 4px 0 #111' }}>
      <h2 className="text-sm font-bold text-[#111] mb-1" style={SG}>{title || 'Untitled'}</h2>
      <p className="text-xs text-gray-400 mb-4">{stat.answered} answer{stat.answered !== 1 ? 's' : ''} · {choices.length} option{choices.length !== 1 ? 's' : ''}</p>
      <div className="space-y-2">
        {choices.slice(0, 10).map(c => {
          const count = distribution[c.id] ?? 0;
          const pct = stat.answered > 0 ? Math.round((count / stat.answered) * 100) : 0;
          const barPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
          return (
            <div key={c.id} className="flex items-center gap-3">
              <p className="text-xs text-[#111] w-28 truncate shrink-0">{c.label}</p>
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden border border-gray-200">
                <div className="h-full bg-[#f97316] rounded transition-all" style={{ width: `${barPct}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-600 w-14 text-right shrink-0">
                {pct}% <span className="text-gray-400 font-normal">({count})</span>
              </span>
            </div>
          );
        })}
        {choices.length > 10 && (
          <p className="text-[10px] text-gray-400">+{choices.length - 10} more options</p>
        )}
      </div>
    </div>
  );
}
