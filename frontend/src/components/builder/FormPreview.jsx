import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { clsx } from 'clsx';

export default function FormPreview() {
  const { form, questions, previewDevice } = useBuilderStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const visibleQuestions = questions.filter(q => q.type !== 'thank_you_screen');
  const thankYou = questions.find(q => q.type === 'thank_you_screen');
  const [submitted, setSubmitted] = useState(false);

  const current = visibleQuestions[currentIndex];
  const isLast = currentIndex === visibleQuestions.length - 1;
  const theme = form?.theme ?? {};
  const primary = theme.primaryColor ?? '#6366f1';

  const goNext = () => {
    if (isLast) { setSubmitted(true); return; }
    setCurrentIndex(i => Math.min(i + 1, visibleQuestions.length - 1));
  };
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const containerClass = clsx(
    'mx-auto bg-white rounded-2xl shadow-lg overflow-hidden',
    previewDevice === 'mobile' ? 'w-80 min-h-[600px]' : 'w-full max-w-xl min-h-[500px]'
  );

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 overflow-auto">
      <div className={containerClass} style={{ fontFamily: theme.fontFamily ?? 'Inter' }}>
        {/* Progress bar */}
        {!submitted && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / visibleQuestions.length) * 100}%`, backgroundColor: primary }}
            />
          </div>
        )}

        <div className="p-8 flex flex-col min-h-[460px]">
          {submitted ? (
            // Thank you screen
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {thankYou?.title || 'Thank you!'}
              </h2>
              <p className="text-gray-500">{thankYou?.config?.message ?? 'Your response has been recorded.'}</p>
              <button
                onClick={() => { setCurrentIndex(0); setAnswers({}); setSubmitted(false); }}
                className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Start over (preview)
              </button>
            </div>
          ) : current ? (
            <QuestionView
              question={current}
              answer={answers[current.id]}
              onAnswer={v => setAnswers(a => ({ ...a, [current.id]: v }))}
              primary={primary}
              index={currentIndex}
              total={visibleQuestions.length}
              onNext={goNext}
              onPrev={goPrev}
              isFirst={currentIndex === 0}
              isLast={isLast}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No questions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionView({ question, answer, onAnswer, primary, index, total, onNext, onPrev, isFirst, isLast }) {
  if (question.type === 'welcome_screen') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{question.title}</h1>
        {question.config?.description && <p className="text-gray-500 mb-8">{question.config.description}</p>}
        <button
          className="px-8 py-3 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary }}
          onClick={onNext}
        >
          {question.config?.buttonLabel ?? 'Start'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Question number */}
      <p className="text-xs text-gray-400 mb-2">{index + 1} / {total}</p>

      {/* Question title */}
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        {question.title || <span className="text-gray-300 italic">Untitled question</span>}
        {question.required && <span className="text-red-400 ml-1">*</span>}
      </h2>
      {question.description && <p className="text-sm text-gray-500 mb-4">{question.description}</p>}

      {/* Answer input */}
      <div className="flex-1 mt-4">
        <AnswerInput question={question} answer={answer} onAnswer={onAnswer} primary={primary} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onPrev} disabled={isFirst}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary }}
        >
          {isLast ? 'Submit' : 'Next'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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
    const selected = answer ?? (config?.allowMultiple ? [] : null);
    return (
      <div className="space-y-2">
        {choices.map(c => {
          const isSelected = config?.allowMultiple ? selected.includes(c.id) : selected === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                if (config?.allowMultiple) {
                  const arr = Array.isArray(selected) ? selected : [];
                  onAnswer(isSelected ? arr.filter(x => x !== c.id) : [...arr, c.id]);
                } else {
                  onAnswer(c.id);
                }
              }}
              className={clsx(
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                isSelected ? 'border-current text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300'
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

  if (type === 'yes_no') {
    return (
      <div className="flex gap-3">
        {['Yes', 'No'].map(opt => (
          <button
            key={opt}
            onClick={() => onAnswer(opt)}
            className={clsx(
              'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
              answer === opt ? 'text-white border-current' : 'border-gray-200 text-gray-700 hover:border-gray-300'
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
    const shape = config?.shape ?? 'star';
    const icons = { star: '⭐', heart: '❤️', thumb: '👍', circle: '●' };
    return (
      <div className="flex gap-2">
        {[...Array(steps)].map((_, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i + 1)}
            className={clsx('text-2xl transition-transform hover:scale-110', (answer ?? 0) > i ? 'opacity-100' : 'opacity-30')}
          >
            {icons[shape]}
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
                answer === i ? 'text-white border-current' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              )}
              style={answer === i ? { borderColor: primary, backgroundColor: primary } : {}}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">{config?.lowLabel ?? 'Not likely'}</span>
          <span className="text-xs text-gray-400">{config?.highLabel ?? 'Extremely likely'}</span>
        </div>
      </div>
    );
  }

  if (type === 'dropdown') {
    return (
      <select className="input text-base py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)}>
        <option value="">Select an option…</option>
        {(config?.choices ?? []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    );
  }

  if (type === 'date') return <input type="date" className="input text-base py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)} />;
  if (type === 'time') return <input type="time" className="input text-base py-3" value={answer ?? ''} onChange={e => onAnswer(e.target.value)} />;

  if (type === 'statement') {
    return <p className="text-gray-600 text-base leading-relaxed">{question.config?.content ?? question.description}</p>;
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

  return <p className="text-xs text-gray-400 italic">Preview not available for {type}</p>;
}
