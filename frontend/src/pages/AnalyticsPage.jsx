import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
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

function TimelineChart({ timeline }) {
  if (!timeline?.length) return null;
  const max = Math.max(...timeline.map(d => d.count), 1);
  const total = timeline.reduce((sum, d) => sum + d.count, 0);

  const fmt = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-6 mb-6" style={{ boxShadow: '4px 4px 0 #111' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-[#111]" style={SG}>Submissions over time</h2>
        <span className="text-xs text-gray-400">{total} in last 30 days</span>
      </div>
      <div className="flex items-end gap-0.5 h-20">
        {timeline.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-sm transition-all cursor-default"
            style={{
              height: `${Math.max((d.count / max) * 80, d.count > 0 ? 4 : 0)}px`,
              backgroundColor: d.count > 0 ? '#f97316' : '#f3f4f6',
            }}
            title={`${fmt(d.date)}: ${d.count} submission${d.count !== 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>{fmt(timeline[0]?.date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function QuestionAnswers({ q, answers }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(answers.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visible = answers.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-[#111] flex-1 min-w-0" style={SG}>{q.title || 'Untitled'}</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] shrink-0">
          {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
        </span>
      </div>
      <div className="space-y-2">
        {visible.map((a, i) => (
          <div key={start + i} className="flex gap-3 items-start">
            <div className="w-1 self-stretch rounded-full shrink-0" style={{ minHeight: '20px', background: '#f97316', opacity: 0.3 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 mb-0.5" style={SG}>#{start + i + 1}</p>
              <p className="text-sm text-gray-700 break-words leading-relaxed">{String(a)}</p>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-[#111] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
            style={SG}
          >← Prev</button>
          <span className="text-xs text-gray-500 flex-1 text-center" style={SG}>
            {start + 1}–{Math.min(start + PAGE_SIZE, answers.length)} of {answers.length}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 border-[#111] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
            style={SG}
          >Next →</button>
        </div>
      )}
    </div>
  );
}

function OpenEndedSection({ questions, textAnswers }) {
  const withAnswers = questions.filter(q => textAnswers[q.id]?.length);
  if (!withAnswers.length) return null;
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] mb-6" style={{ boxShadow: '4px 4px 0 #111' }}>
      <div className="px-6 py-4 border-b-2 border-[#111] flex items-center gap-2">
        <span className="text-base">💬</span>
        <h2 className="text-sm font-bold text-[#111]" style={SG}>Open-ended answers</h2>
        <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-wider">{withAnswers.length} question{withAnswers.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y-2 divide-[#f3f0e8]">
        {withAnswers.map(q => (
          <div key={q.id} className="px-6 py-5">
            <QuestionAnswers q={q} answers={textAnswers[q.id]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceBreakdownCard({ sources, totalResponses }) {
  if (!sources?.length) return null;
  const max = Math.max(...sources.map(s => s.count), 1);
  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-6 mb-4" style={{ boxShadow: '4px 4px 0 #111' }}>
      <h2 className="text-sm font-bold text-[#111] mb-5" style={SG}>Traffic sources</h2>
      <div className="space-y-3">
        {sources.map(({ source, count }) => {
          const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
          const barPct = Math.round((count / max) * 100);
          return (
            <div key={source} className="flex items-center gap-3">
              <p className="text-xs text-[#111] w-28 truncate shrink-0">{source}</p>
              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden border border-gray-200">
                <div className="h-full rounded transition-all" style={{ width: `${barPct}%`, backgroundColor: '#6366f1' }} />
              </div>
              <span className="text-xs font-bold text-gray-600 w-14 text-right shrink-0">
                {pct}% <span className="text-gray-400 font-normal">({count})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceDistribution({ title, q, stat, choices, avgScore, maxScore, isNps }) {
  const distribution = stat.distribution ?? {};
  const maxCount = Math.max(...choices.map(c => distribution[c.id] ?? 0), 1);

  let npsScore = null;
  let promoters = 0, passives = 0, detractors = 0;
  if (isNps && stat.answered > 0) {
    for (const c of choices) {
      const val = parseInt(c.id);
      const count = distribution[c.id] ?? 0;
      if (val >= 9) promoters += count;
      else if (val >= 7) passives += count;
      else detractors += count;
    }
    npsScore = Math.round(((promoters - detractors) / stat.answered) * 100);
  }

  return (
    <div className="bg-white rounded-xl border-2 border-[#111] p-6 mb-4" style={{ boxShadow: '4px 4px 0 #111' }}>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-sm font-bold text-[#111]" style={SG}>{title || 'Untitled'}</h2>
        {avgScore != null && !isNps && (
          <div className="text-right shrink-0 ml-4">
            <span className="text-xl font-bold text-[#111]">{avgScore.toFixed(1)}</span>
            {maxScore && <span className="text-xs text-gray-400 ml-1">/ {maxScore} avg</span>}
          </div>
        )}
        {isNps && npsScore != null && (
          <div className="text-right shrink-0 ml-4">
            <span
              className="text-xl font-bold"
              style={{ color: npsScore > 30 ? '#16a34a' : npsScore > 0 ? '#f97316' : '#dc2626' }}
            >
              {npsScore > 0 ? '+' : ''}{npsScore}
            </span>
            <span className="text-xs text-gray-400 ml-1">NPS</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {stat.answered} answer{stat.answered !== 1 ? 's' : ''} · {choices.length} option{choices.length !== 1 ? 's' : ''}
      </p>

      {isNps && stat.answered > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-1 mb-2" style={{ height: 8 }}>
            {detractors > 0 && <div style={{ flex: detractors, backgroundColor: '#ef4444', borderRadius: 3 }} />}
            {passives > 0 && <div style={{ flex: passives, backgroundColor: '#f59e0b', borderRadius: 3 }} />}
            {promoters > 0 && <div style={{ flex: promoters, backgroundColor: '#22c55e', borderRadius: 3 }} />}
          </div>
          <div className="flex gap-4 text-[10px] font-medium">
            <span style={{ color: '#dc2626' }}>Detractors {detractors}</span>
            <span style={{ color: '#d97706' }}>Passives {passives}</span>
            <span style={{ color: '#16a34a' }}>Promoters {promoters}</span>
          </div>
        </div>
      )}

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

async function downloadCsv(formId, formTitle) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  const res = await fetch(api.responses.exportCsv(formId), { headers });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(formTitle || 'responses').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { formId } = useParams();
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState(null);

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

  const choiceQuestions = (form?.questions ?? []).filter(q =>
    ['multiple_choice', 'dropdown', 'yes_no', 'rating', 'nps'].includes(q.type)
  );
  const textQuestions = (form?.questions ?? []).filter(q =>
    ['short_text', 'long_text', 'email', 'phone', 'address'].includes(q.type)
  );

  const avgTime = analytics?.avg_completion_seconds
    ? analytics.avg_completion_seconds >= 60
      ? `${Math.floor(analytics.avg_completion_seconds / 60)}m ${analytics.avg_completion_seconds % 60}s`
      : `${analytics.avg_completion_seconds}s`
    : null;

  const hasData = analytics && (analytics.views > 0 || analytics.starts > 0 || analytics.completions > 0);

  return (
    <div className="h-screen flex flex-col bg-[#FFFBF2] overflow-hidden">
      <FormHeader staticTitle={form?.title} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#111]" style={SG}>Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">Response rates, drop-off, and answer breakdowns.</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <button
                onClick={async () => {
                  setCsvError(null);
                  setCsvLoading(true);
                  try { await downloadCsv(formId, form?.title); }
                  catch (e) { setCsvError('Download failed. Try again.'); }
                  finally { setCsvLoading(false); }
                }}
                disabled={csvLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#111] bg-white text-sm font-semibold text-[#111] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ ...SG, boxShadow: '3px 3px 0 #111' }}
              >
                {csvLoading
                  ? <><span className="w-3.5 h-3.5 border-2 border-[#111] border-t-transparent rounded-full animate-spin inline-block" /> Exporting…</>
                  : <>⬇ Download CSV</>
                }
              </button>
              {csvError && <p className="text-[10px] text-red-500">{csvError}</p>}
            </div>
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

              {/* Submissions over time */}
              <TimelineChart timeline={analytics?.timeline} />

              {analytics?.partial > 0 && (
                <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800" style={SG}>
                      {analytics.partial} partial submission{analytics.partial !== 1 ? 's' : ''}
                    </p>
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
                      .filter(s => !['welcome_screen', 'thank_you_screen', 'statement'].includes(
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

              {/* Choice question distributions + avg scores */}
              {choiceQuestions.map(q => {
                const stat = (analytics?.question_stats ?? []).find(s => s.question_id === q.id);
                if (!stat || stat.answered === 0) return null;
                const avgScore = analytics?.avg_scores?.[q.id];

                if (q.type === 'yes_no') {
                  return (
                    <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                      choices={[{ id: 'Yes', label: 'Yes' }, { id: 'No', label: 'No' }]}
                      total={stat.answered} avgScore={avgScore} />
                  );
                }
                if (q.type === 'rating') {
                  const steps = q.config?.steps ?? 5;
                  return (
                    <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                      choices={[...Array(steps)].map((_, i) => ({ id: String(i + 1), label: String(i + 1) }))}
                      total={stat.answered} avgScore={avgScore} maxScore={steps} />
                  );
                }
                if (q.type === 'nps') {
                  return (
                    <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                      choices={[...Array(11)].map((_, i) => ({ id: String(i), label: String(i) }))}
                      total={stat.answered} avgScore={avgScore} isNps />
                  );
                }
                const choices = q.config?.choices ?? [];
                if (choices.length === 0) return null;
                return (
                  <ChoiceDistribution key={q.id} title={q.title} q={q} stat={stat}
                    choices={choices} total={stat.answered} avgScore={avgScore} />
                );
              })}

              {/* Text / open-ended answers */}
              {textQuestions.length > 0 && analytics?.text_answers && (
                <OpenEndedSection questions={textQuestions} textAnswers={analytics.text_answers} />
              )}

              {/* Traffic source breakdown */}
              {analytics?.source_breakdown?.length > 0 && (
                <SourceBreakdownCard
                  sources={analytics.source_breakdown}
                  totalResponses={analytics.completions}
                />
              )}

              {!hasData && (
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
