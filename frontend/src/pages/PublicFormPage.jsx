import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { nanoid } from 'nanoid';
import { clsx } from 'clsx';

export default function PublicFormPage() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Respondent state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [quizScore, setQuizScore] = useState(null);
  const startedAt = useRef(Date.now());
  const respondentId = useRef(nanoid());
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  // Partial submission: fire-and-forget on page unload if form allows it
  useEffect(() => {
    if (!form?.settings?.allowPartialSubmissions) return;
    const handleBeforeUnload = () => {
      if (submittedRef.current || Object.keys(answersRef.current).length === 0) return;
      navigator.sendBeacon(
        `/api/public/forms/${form.id}/responses/partial`,
        new Blob([JSON.stringify({
          answers: answersRef.current,
          respondent_id: respondentId.current,
          started_at: new Date(startedAt.current).toISOString(),
        })], { type: 'application/json' })
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form]);

  useEffect(() => {
    api.public.getForm(slug)
      .then(({ form, requiresPassword }) => {
        setForm(form);
        setRequiresPassword(!!requiresPassword);
        setLoading(false);
        if (!requiresPassword) {
          api.public.startForm(form.id).catch(() => {});
        }

        // Inject hidden fields from URL params
        const hiddenFields = form.settings?.hiddenFields ?? [];
        if (hiddenFields.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const injected = {};
          hiddenFields.forEach(f => {
            if (f.key && params.has(f.key)) injected[`__hf_${f.key}`] = params.get(f.key);
          });
          if (Object.keys(injected).length > 0) {
            setAnswers(a => ({ ...a, ...injected }));
          }
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorPage message={error} />;
  if (!form) return null;

  // Password gate
  if (requiresPassword && !passwordUnlocked) {
    return (
      <PasswordGate
        slug={slug}
        formTitle={form.title}
        primaryColor={form.theme?.primaryColor ?? '#6366f1'}
        onUnlocked={() => {
          setPasswordUnlocked(true);
          api.public.startForm(form.id).catch(() => {});
        }}
      />
    );
  }

  const questions = (form.questions ?? []).filter(q => q.type !== 'thank_you_screen');
  const thankYouQ = (form.questions ?? []).find(q => q.type === 'thank_you_screen');
  const theme = form.theme ?? {};
  const primary = theme.primaryColor ?? '#6366f1';

  const current = questions[currentIndex];
  const nextIndex = current ? getNextIndex(currentIndex, questions, answers) : questions.length;
  const isLast = nextIndex >= questions.length;

  const handleNext = async () => {
    const resolvedNext = current ? getNextIndex(currentIndex, questions, answers) : questions.length;
    if (resolvedNext >= questions.length) {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const result = await api.public.submit(form.id, {
          answers,
          respondent_id: respondentId.current,
          started_at: new Date(startedAt.current).toISOString(),
          completion_time_ms: Date.now() - startedAt.current,
          referrer: document.referrer || undefined,
          utm_source: new URLSearchParams(window.location.search).get('utm_source'),
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        });
        if (form.settings?.quizMode) {
          setQuizScore(computeScore(questions, answers));
        }
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
          return;
        }
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentIndex(resolvedNext);
    }
  };

  const handlePrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const setAnswer = (id, value) => setAnswers(a => ({ ...a, [id]: value }));

  const bgStyle = {
    backgroundColor: theme.backgroundColor ?? '#ffffff',
    fontFamily: theme.fontFamily ?? 'Playfair Display, Georgia, serif',
    minHeight: '100vh',
  };

  return (
    <div style={bgStyle} className="relative flex flex-col">
      {/* Progress */}
      {!submitted && questions.length > 0 && (
        <div className="h-1 w-full bg-black/10 fixed top-0 z-10">
          <div
            className="h-full transition-all duration-400"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, backgroundColor: primary }}
          />
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          {submitted ? (
            <ThankYouScreen question={thankYouQ} primary={primary} formTitle={form.title} quizScore={quizScore} quizMode={form.settings?.quizMode} />
          ) : current ? (
            <QuestionSlide
              question={pipeAnswers(current, questions, answers)}
              answer={answers[current.id]}
              onAnswer={(v) => setAnswer(current.id, v)}
              primary={primary}
              index={currentIndex}
              total={questions.length}
              onNext={handleNext}
              onPrev={handlePrev}
              isFirst={currentIndex === 0}
              isLast={isLast}
              submitting={submitting}
              submitError={submitError}
              formId={form.id}
            />
          ) : (
            <p className="text-gray-400 text-center">This form has no questions.</p>
          )}
        </div>
      </div>

      {/* Branding */}
      {!form.settings?.removeBranding && (
        <div className="text-center py-3">
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600">
            Powered by <span className="font-semibold">FormFlow</span>
          </a>
        </div>
      )}
    </div>
  );
}

function QuestionSlide({ question, answer, onAnswer, primary, index, total, onNext, onPrev, isFirst, isLast, submitting, submitError, formId }) {
  if (question.type === 'welcome_screen') {
    return (
      <div className="text-center animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{question.title}</h1>
        {question.config?.description && <p className="text-lg text-gray-600 mb-10">{question.config.description}</p>}
        <button
          className="px-10 py-4 rounded-2xl text-white font-semibold text-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary }}
          onClick={onNext}
        >
          {question.config?.buttonLabel ?? 'Start'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-gray-400 mb-3">{index + 1} / {total}</p>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        {question.title}
        {question.required && <span className="text-red-400 ml-1 text-lg">*</span>}
      </h2>
      {question.description && <p className="text-gray-500 mb-6">{question.description}</p>}

      <div className="mt-6 mb-8">
        <PublicAnswerInput question={question} answer={answer} onAnswer={onAnswer} primary={primary} formId={formId} />
      </div>

      {submitError && (
        <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-lg">{submitError}</p>
      )}

      <div className="flex items-center gap-3">
        {!isFirst && (
          <button onClick={onPrev} className="btn-secondary">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={submitting || (question.required && !hasAnswer(answer))}
          className="px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: primary }}
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>{isLast ? 'Submit' : 'Next'} <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}

function PublicAnswerInput({ question, answer, onAnswer, primary, formId }) {
  const { type, config } = question;

  if (['short_text', 'email', 'phone', 'number'].includes(type)) {
    return (
      <input
        autoFocus
        type={type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'}
        className="w-full text-lg border-b-2 border-gray-300 focus:border-current outline-none bg-transparent py-2 transition-colors"
        style={{ '--tw-ring-color': primary }}
        onFocus={e => e.target.style.borderColor = primary}
        onBlur={e => e.target.style.borderColor = '#d1d5db'}
        placeholder={config?.placeholder ?? ''}
        value={answer ?? ''}
        onChange={e => onAnswer(e.target.value)}
      />
    );
  }

  if (type === 'long_text') {
    return (
      <textarea
        autoFocus rows={4}
        className="w-full text-lg border-b-2 border-gray-300 focus:border-current outline-none bg-transparent py-2 resize-none transition-colors"
        placeholder={config?.placeholder ?? ''}
        value={answer ?? ''}
        onChange={e => onAnswer(e.target.value)}
        onFocus={e => e.target.style.borderColor = primary}
        onBlur={e => e.target.style.borderColor = '#d1d5db'}
      />
    );
  }

  if (type === 'multiple_choice') {
    const choices = config?.choices ?? [];
    const selected = answer ?? (config?.allowMultiple ? [] : null);
    return (
      <div className="space-y-2.5">
        {choices.map(c => {
          const isSel = config?.allowMultiple ? (Array.isArray(selected) && selected.includes(c.id)) : selected === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                if (config?.allowMultiple) {
                  const arr = Array.isArray(selected) ? selected : [];
                  onAnswer(isSel ? arr.filter(x => x !== c.id) : [...arr, c.id]);
                } else onAnswer(c.id);
              }}
              className="w-full text-left px-5 py-3.5 rounded-xl border-2 text-base font-medium transition-all"
              style={isSel ? { borderColor: primary, backgroundColor: primary, color: '#fff' } : { borderColor: '#e5e7eb', color: '#374151' }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'yes_no') {
    return (
      <div className="flex gap-3">
        {['Yes', 'No'].map(opt => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className="flex-1 py-4 rounded-xl border-2 text-base font-semibold transition-all"
            style={answer === opt ? { borderColor: primary, backgroundColor: primary, color: '#fff' } : { borderColor: '#e5e7eb', color: '#374151' }}
          >
            {opt === 'Yes' ? '👍  Yes' : '👎  No'}
          </button>
        ))}
      </div>
    );
  }

  if (type === 'rating') {
    const steps = config?.steps ?? 5;
    const shapes = { star: '★', heart: '♥', thumb: '👍', circle: '●' };
    return (
      <div className="flex gap-2">
        {[...Array(steps)].map((_, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i + 1)}
            className="text-3xl transition-all hover:scale-110 focus:outline-none"
            style={{ color: (answer ?? 0) > i ? primary : '#d1d5db' }}
          >
            {shapes[config?.shape] ?? '★'}
          </button>
        ))}
      </div>
    );
  }

  if (type === 'nps') {
    return (
      <div>
        <div className="flex gap-1.5 flex-wrap">
          {[...Array(11)].map((_, i) => (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              className="w-11 h-11 rounded-xl border-2 text-sm font-semibold transition-all"
              style={answer === i
                ? { borderColor: primary, backgroundColor: primary, color: '#fff' }
                : { borderColor: '#e5e7eb', color: '#6b7280' }}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-3">
          <span className="text-xs text-gray-400">{config?.lowLabel ?? 'Not likely'}</span>
          <span className="text-xs text-gray-400">{config?.highLabel ?? 'Extremely likely'}</span>
        </div>
      </div>
    );
  }

  if (type === 'dropdown') {
    return (
      <select
        className="w-full text-lg border-b-2 border-gray-300 focus:outline-none bg-transparent py-2"
        value={answer ?? ''} onChange={e => onAnswer(e.target.value)}
        onFocus={e => e.target.style.borderColor = primary}
        onBlur={e => e.target.style.borderColor = '#d1d5db'}
      >
        <option value="">Select…</option>
        {(config?.choices ?? []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    );
  }

  if (type === 'date') return <input type="date" className="input text-lg py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)} />;
  if (type === 'time') return <input type="time" className="input text-lg py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)} />;

  if (type === 'statement') return <p className="text-gray-600 text-lg leading-relaxed">{question.description}</p>;

  if (type === 'file_upload') {
    return <FileUploadInput config={config} answer={answer} onAnswer={onAnswer} formId={formId} primary={primary} />;
  }

  return null;
}

function FileUploadInput({ config, answer, onAnswer, formId, primary }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const maxMb = config?.maxSizeMb ?? 10;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`File too large. Max size is ${maxMb}MB.`);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const result = await api.public.uploadFile(formId, file);
      onAnswer(result.url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (answer) {
    return (
      <div className="border-2 border-green-400 rounded-2xl p-6 bg-green-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 truncate">File uploaded</p>
            <a href={answer} target="_blank" rel="noreferrer" className="text-xs text-green-600 underline truncate block">
              {answer.split('/').pop()}
            </a>
          </div>
          <button
            onClick={() => onAnswer(null)}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className={clsx(
        'flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-colors',
        uploading ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-gray-300 hover:border-gray-400'
      )}>
        {uploading ? (
          <>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
            <span className="text-gray-500 font-medium">Uploading…</span>
          </>
        ) : (
          <>
            <span className="text-4xl mb-3">📎</span>
            <span className="text-gray-600 font-medium">Click to upload a file</span>
            <span className="text-sm text-gray-400 mt-1">
              {(config?.allowedTypes ?? []).join(', ').toUpperCase() || 'Any file type'} · Max {maxMb}MB
            </span>
          </>
        )}
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          accept={config?.allowedTypes?.map(t => `.${t}`).join(',') || undefined}
          onChange={handleFile}
        />
      </label>
      {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
    </div>
  );
}

function PasswordGate({ slug, formTitle, primaryColor, onUnlocked }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    setError(null);
    try {
      const { valid } = await api.public.verifyPassword(slug, password);
      if (valid) {
        onUnlocked();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-[#111] p-8" style={{ boxShadow: '6px 6px 0 #111' }}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-[#111]">{formTitle || 'Protected Form'}</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the password to access this form.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="w-full border-2 border-[#111] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-offset-1 pr-12"
              style={{ focusRingColor: primaryColor }}
              placeholder="Password"
              value={password}
              autoFocus
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={checking || !password}
            className="w-full py-3 rounded-xl text-white font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: primaryColor }}
          >
            {checking ? 'Checking…' : 'Unlock form'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ThankYouScreen({ question, primary, formTitle, quizScore, quizMode }) {
  return (
    <div className="text-center animate-fade-in">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">
        {question?.title ?? 'Thank you!'}
      </h2>
      <p className="text-lg text-gray-500">
        {question?.config?.message ?? 'Your response has been recorded.'}
      </p>
      {quizMode && quizScore !== null && (
        <div className="mt-8 inline-block px-8 py-5 rounded-2xl border-2 border-gray-200 bg-white shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-1">Your score</p>
          <p className="text-5xl font-bold" style={{ color: primary }}>{quizScore}</p>
          <p className="text-sm text-gray-400 mt-1">points</p>
        </div>
      )}
    </div>
  );
}

function hasAnswer(answer) {
  if (answer === undefined || answer === null || answer === '') return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return true;
}

// ── Answer piping ─────────────────────────────────────────────────────
// Replace @{questionId} in title/description with the respondent's answer
function pipeAnswers(question, questions, answers) {
  const replace = (text) => {
    if (!text || !text.includes('@{')) return text;
    return text.replace(/@\{([^}]+)\}/g, (_, qId) => {
      const q = questions.find(q => q.id === qId);
      if (!q) return `@{${qId}}`;
      const ans = answers[qId];
      if (ans === undefined || ans === null || ans === '') return '…';
      if (Array.isArray(ans)) {
        return ans.map(id => (q.config?.choices ?? []).find(c => c.id === id)?.label ?? id).join(', ');
      }
      const choice = (q.config?.choices ?? []).find(c => c.id === ans);
      return choice?.label ?? String(ans);
    });
  };
  return { ...question, title: replace(question.title), description: replace(question.description) };
}

// ── Quiz scoring ──────────────────────────────────────────────────────
function computeScore(questions, answers) {
  let total = 0;
  for (const q of questions) {
    const scores = q.config?.scores;
    if (!scores) continue;
    const ans = answers[q.id];
    if (ans === undefined || ans === null) continue;
    const ids = Array.isArray(ans) ? ans : [ans];
    ids.forEach(id => { total += Number(scores[id] ?? 0); });
  }
  return total;
}

function matchesCondition(answer, condition) {
  if (!condition) return false;
  const { op, value } = condition;
  const a = answer ?? '';
  switch (op) {
    case 'eq':       return String(a) === String(value ?? '');
    case 'neq':      return String(a) !== String(value ?? '');
    case 'contains': return String(a).toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'gt':       return Number(a) > Number(value ?? 0);
    case 'lt':       return Number(a) < Number(value ?? 0);
    case 'answered': return hasAnswer(answer);
    default:         return false;
  }
}

function getNextIndex(currentIdx, questions, answers) {
  const current = questions[currentIdx];
  if (!current) return currentIdx + 1;
  const rules = current.logic ?? [];
  const currentAnswer = answers[current.id];
  for (const rule of rules) {
    if (matchesCondition(currentAnswer, rule.condition)) {
      if (rule.target === 'end') return questions.length;
      const targetIdx = questions.findIndex(q => q.id === rule.target);
      if (targetIdx >= 0) return targetIdx;
    }
  }
  return currentIdx + 1;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorPage({ message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-5xl mb-4">😕</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Form not available</h1>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
