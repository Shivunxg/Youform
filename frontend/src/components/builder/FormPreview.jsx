import { useState, useEffect, useCallback } from 'react';
import { X, Monitor, Smartphone, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { clsx } from 'clsx';

export default function FormPreview() {
  const { form, questions, setPreviewMode } = useBuilderStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState({});
  const [submitted, setSubmitted]       = useState(false);
  const [device, setDevice]             = useState('desktop');
  const [skipValidation, setSkipValidation] = useState(false);

  const allBlocks       = questions;
  const visibleBlocks   = questions.filter(q => q.type !== 'thank_you_screen');
  const thankYou        = questions.find(q => q.type === 'thank_you_screen');
  const current         = visibleBlocks[currentIndex];
  const isFirst         = currentIndex === 0;
  const isLast          = currentIndex === visibleBlocks.length - 1;
  const theme           = form?.theme ?? {};
  const primary         = theme.buttonColor ?? theme.primaryColor ?? '#6366f1';

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
  }, []);

  const canAdvance = useCallback(() => {
    if (skipValidation || !current?.required) return true;
    const answer = answers[current?.id];
    if (answer === null || answer === undefined || answer === '') return false;
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'string') return answer.trim().length > 0;
    return true;
  }, [skipValidation, current, answers]);

  const goNext = useCallback(() => {
    if (submitted) return;
    if (!canAdvance()) return;
    if (isLast) { setSubmitted(true); return; }
    setCurrentIndex(i => i + 1);
  }, [submitted, canAdvance, isLast]);

  const goPrev = useCallback(() => {
    if (submitted) { setSubmitted(false); return; }
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, [submitted]);

  // Keyboard: Enter = advance, Escape = close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setPreviewMode(false); return; }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, setPreviewMode]);

  const hasImage = !!theme.backgroundImage;
  const outerStyle = {
    backgroundColor: theme.backgroundColor ?? '#f1f5f9',
    ...(hasImage && {
      backgroundImage: `url(${theme.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* ── Preview toolbar ── */}
      <div className="h-11 bg-[#111] flex items-center px-4 gap-3 shrink-0">
        {/* Device toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/20">
          <button
            onClick={() => setDevice('desktop')}
            title="Desktop"
            className={clsx('p-1.5 transition-colors', device === 'desktop' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80')}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            title="Mobile"
            className={clsx('p-1.5 transition-colors', device === 'mobile' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80')}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={reset}
          title="Restart from beginning"
          className="p-1.5 text-white/60 hover:text-white transition-colors rounded-md hover:bg-white/10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-white/20" />

        {/* Skip Validation toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-white/70 font-medium">Skip Validation</span>
          <button
            type="button"
            role="switch"
            aria-checked={skipValidation}
            onClick={() => setSkipValidation(v => !v)}
            className={clsx(
              'relative w-8 h-4 rounded-full transition-colors flex-shrink-0',
              skipValidation ? 'bg-[#f97316]' : 'bg-white/20'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                skipValidation ? 'translate-x-[18px]' : 'translate-x-0.5'
              )}
            />
          </button>
        </label>

        <div className="flex-1" />

        <span className="text-xs text-white/40 font-medium">Preview</span>

        {/* Close */}
        <button
          onClick={() => setPreviewMode(false)}
          title="Close preview (Esc)"
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Preview area ── */}
      <div className="flex-1 relative overflow-hidden" style={outerStyle}>
        {hasImage && <div className="absolute inset-0 bg-black/25 z-0" />}

        <div className="absolute inset-0 flex items-center justify-center p-8 overflow-auto">
          <div
            className={clsx(
              'rounded-2xl overflow-hidden relative z-10 flex flex-col',
              device === 'mobile' ? 'w-80 min-h-[600px]' : 'w-full max-w-xl min-h-[500px]',
              hasImage ? 'shadow-2xl' : 'shadow-lg bg-white'
            )}
            style={{
              fontFamily: theme.fontFamily ?? 'Playfair Display, Georgia, serif',
              color: theme.questionColor ?? '#111111',
              ...(hasImage && { backgroundColor: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(2px)' }),
              ...(!hasImage && theme.backgroundColor && { backgroundColor: theme.backgroundColor }),
            }}
          >
            {/* Progress bar */}
            {!submitted && visibleBlocks.length > 0 && (
              <div className="h-1 shrink-0" style={{ backgroundColor: `${primary}22` }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / visibleBlocks.length) * 100}%`,
                    backgroundColor: primary,
                  }}
                />
              </div>
            )}

            {/* Split layout when block has a blockImage */}
            {!submitted && current?.config?.blockImage && !['welcome_screen', 'thank_you_screen'].includes(current.type) ? (
              <div className="flex flex-1 min-h-[460px]">
                {current.config.blockImagePosition === 'left' && (
                  <div
                    className="w-2/5 shrink-0"
                    style={{ backgroundImage: `url(${current.config.blockImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                )}
                <div className="flex-1 p-8 flex flex-col">
                  <QuestionView
                    question={current}
                    answer={answers[current.id]}
                    onAnswer={v => setAnswers(a => ({ ...a, [current.id]: v }))}
                    primary={primary}
                    index={currentIndex}
                    total={visibleBlocks.length}
                    onNext={goNext}
                    onPrev={goPrev}
                    isFirst={isFirst}
                    isLast={isLast}
                    canAdvance={canAdvance()}
                  />
                </div>
                {current.config.blockImagePosition !== 'left' && (
                  <div
                    className="w-2/5 shrink-0"
                    style={{ backgroundImage: `url(${current.config.blockImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 p-8 flex flex-col min-h-[460px]">
                {submitted ? (
                  <ThankYouView thankYou={thankYou} onReset={reset} primary={primary} />
                ) : current ? (
                  <QuestionView
                    question={current}
                    answer={answers[current.id]}
                    onAnswer={v => setAnswers(a => ({ ...a, [current.id]: v }))}
                    primary={primary}
                    index={currentIndex}
                    total={visibleBlocks.length}
                    onNext={goNext}
                    onPrev={goPrev}
                    isFirst={isFirst}
                    isLast={isLast}
                    canAdvance={canAdvance()}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    No questions yet — add blocks in the builder.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Thank-you screen ──────────────────────────────────────────────────────────
function ThankYouView({ thankYou, onReset, primary }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-semibold mb-2 text-balance">
        {thankYou?.title || 'Thank you!'}
      </h2>
      <p className="text-sm opacity-60 mb-8">
        {thankYou?.config?.message ?? 'Your response has been recorded.'}
      </p>
      <button
        onClick={onReset}
        className="text-xs underline opacity-40 hover:opacity-70 transition-opacity"
      >
        ↺ Restart preview
      </button>
    </div>
  );
}

// ── Per-question view ─────────────────────────────────────────────────────────
function QuestionView({
  question, answer, onAnswer, primary,
  index, total, onNext, onPrev,
  isFirst, isLast, canAdvance,
}) {
  if (question.type === 'welcome_screen') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-3 text-balance leading-tight">
          {question.title || 'Welcome'}
        </h1>
        {question.config?.description && (
          <p className="opacity-60 mb-8 text-sm leading-relaxed">{question.config.description}</p>
        )}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            {question.config?.buttonLabel ?? 'Start'}
          </button>
          <span className="text-xs opacity-30">press Enter ↵</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-xs opacity-40 mb-2">{index + 1} / {total}</p>

      <h2 className="text-xl font-semibold mb-1 text-balance leading-snug">
        {question.title || <span className="opacity-30 italic">Untitled question</span>}
        {question.required && <span className="text-red-400 ml-1">*</span>}
      </h2>
      {question.description && (
        <p className="text-sm opacity-60 mb-4 leading-relaxed">{question.description}</p>
      )}

      <div className="flex-1 mt-4">
        <AnswerInput question={question} answer={answer} onAnswer={onAnswer} primary={primary} />
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-black/10">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="flex items-center gap-1 text-sm font-medium opacity-50 hover:opacity-80 transition-opacity disabled:opacity-20"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs opacity-30">press Enter ↵</span>
          <button
            onClick={onNext}
            disabled={!canAdvance}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: primary }}
          >
            {isLast ? 'Submit' : 'Next'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Answer inputs ─────────────────────────────────────────────────────────────
function AnswerInput({ question, answer, onAnswer, primary }) {
  const { type, config } = question;

  if (type === 'short_text' || type === 'email' || type === 'phone' || type === 'number') {
    return (
      <input
        type={type === 'number' ? 'number' : type === 'email' ? 'email' : 'text'}
        className="input text-base py-3"
        placeholder={config?.placeholder ?? ''}
        value={answer ?? ''}
        onChange={e => onAnswer(e.target.value)}
        autoFocus
      />
    );
  }

  if (type === 'long_text') {
    return (
      <textarea
        rows={4}
        className="input resize-none text-base py-3"
        placeholder={config?.placeholder ?? ''}
        value={answer ?? ''}
        onChange={e => onAnswer(e.target.value)}
      />
    );
  }

  if (type === 'multiple_choice') {
    const choices = config?.choices ?? [];
    const sel = answer ?? (config?.allowMultiple ? [] : null);
    return (
      <div className="space-y-2">
        {choices.map(c => {
          const isSelected = config?.allowMultiple ? (Array.isArray(sel) && sel.includes(c.id)) : sel === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                if (config?.allowMultiple) {
                  const arr = Array.isArray(sel) ? sel : [];
                  onAnswer(isSelected ? arr.filter(x => x !== c.id) : [...arr, c.id]);
                } else {
                  onAnswer(c.id);
                }
              }}
              className={clsx(
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                isSelected ? 'text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
              )}
              style={isSelected ? { borderColor: primary, backgroundColor: primary } : {}}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'dropdown') {
    return (
      <select
        className="input text-base py-3"
        value={answer ?? ''}
        onChange={e => onAnswer(e.target.value)}
      >
        <option value="">Select an option…</option>
        {(config?.choices ?? []).map(c => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    );
  }

  if (type === 'yes_no') {
    return (
      <div className="flex gap-3">
        {['Yes', 'No'].map(opt => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className={clsx(
              'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
              answer === opt ? 'text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
            )}
            style={answer === opt ? { borderColor: primary, backgroundColor: primary } : {}}
          >
            {opt === 'Yes' ? '👍 Yes' : '👎 No'}
          </button>
        ))}
      </div>
    );
  }

  if (type === 'rating') {
    const steps = config?.steps ?? 5;
    const icons = { star: '⭐', heart: '❤️', thumb: '👍', circle: '●' };
    const icon = icons[config?.shape ?? 'star'];
    return (
      <div className="flex gap-2">
        {[...Array(steps)].map((_, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i + 1)}
            className={clsx('text-2xl transition-transform hover:scale-110', (answer ?? 0) > i ? 'opacity-100' : 'opacity-25')}
          >
            {icon}
          </button>
        ))}
      </div>
    );
  }

  if (type === 'nps') {
    return (
      <div>
        <div className="flex gap-1 flex-wrap">
          {[...Array(11)].map((_, i) => (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              className={clsx(
                'w-9 h-9 rounded-lg text-sm font-medium border-2 transition-all',
                answer === i ? 'text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              )}
              style={answer === i ? { borderColor: primary, backgroundColor: primary } : {}}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs opacity-40">{config?.lowLabel ?? 'Not likely'}</span>
          <span className="text-xs opacity-40">{config?.highLabel ?? 'Extremely likely'}</span>
        </div>
      </div>
    );
  }

  if (type === 'date') {
    return <input type="date" className="input text-base py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)} />;
  }
  if (type === 'time') {
    return <input type="time" className="input text-base py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)} />;
  }

  if (type === 'statement') {
    return <p className="text-base leading-relaxed opacity-70">{config?.content ?? question.description}</p>;
  }

  if (type === 'file_upload') {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
        <p className="text-3xl mb-2">📎</p>
        <p className="text-sm text-gray-500">Click to upload or drag & drop</p>
        <p className="text-xs text-gray-400 mt-1">
          {(config?.allowedTypes ?? []).join(', ').toUpperCase()} · Max {config?.maxSizeMb ?? 10}MB
        </p>
      </div>
    );
  }

  return <p className="text-xs opacity-40 italic">No preview for "{type}"</p>;
}
