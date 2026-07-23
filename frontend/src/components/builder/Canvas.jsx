import { useState, useRef, useEffect } from 'react';
import { Plus, Paintbrush, GitBranch, Monitor, Smartphone, Check, Loader } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { TypePickerDropdown } from './BlockList';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function Canvas({ onToggleDesign }) {
  const {
    form, questions, selectedQuestionId, addQuestion,
    isDirty, isSaving, previewDevice, setPreviewDevice,
    openLogicPanel, logicPanelOpen, designPanelOpen, toggleDesignPanel,
  } = useBuilderStore();

  const [showAddPicker, setShowAddPicker] = useState(false);
  const pickerRef = useRef(null);

  const primary = form?.theme?.buttonColor ?? form?.theme?.primaryColor ?? '#6366f1';
  const bgColor = form?.theme?.backgroundColor;
  const questionColor = form?.theme?.questionColor;
  const globalAlign = form?.theme?.alignment ?? 'left';
  const mainBlocks = questions.filter(q => q.type !== 'thank_you_screen');
  const selected = questions.find(q => q.id === selectedQuestionId);
  const textAlign = selected?.config?.alignment ?? globalAlign;
  const currentIndex = mainBlocks.findIndex(q => q.id === selectedQuestionId);

  useEffect(() => {
    if (!showAddPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowAddPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddPicker]);

  const handleAddBlock = (type) => {
    addQuestion(type, selectedQuestionId);
    setShowAddPicker(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden min-w-0">
      {/* Canvas toolbar */}
      <div className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
        {/* Add block */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowAddPicker(v => !v)}
            className="btn-primary text-xs h-7 px-2.5 gap-1.5 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add block
          </button>
          {showAddPicker && (
            <TypePickerDropdown onSelect={handleAddBlock} onClose={() => setShowAddPicker(false)} anchor="left" />
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Design */}
        <button
          onClick={toggleDesignPanel}
          className={clsx(
            'btn-ghost text-xs h-7 px-2.5 gap-1.5 rounded-lg',
            designPanelOpen && 'bg-brand-50 text-brand-600'
          )}
        >
          <Paintbrush className="w-3.5 h-3.5" /> Design
        </button>

        {/* Logic */}
        <button
          onClick={openLogicPanel}
          className={clsx(
            'btn-ghost text-xs h-7 px-2.5 gap-1.5 rounded-lg',
            logicPanelOpen && 'bg-brand-50 text-brand-600'
          )}
        >
          <GitBranch className="w-3.5 h-3.5" /> Logic
        </button>

        <div className="flex-1" />

        {/* Save status pill */}
        <div className={clsx(
          'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium',
          isSaving
            ? 'text-amber-600 bg-amber-50'
            : isDirty
              ? 'text-amber-500 bg-amber-50'
              : 'text-emerald-600 bg-emerald-50'
        )}>
          {isSaving
            ? <Loader className="w-3 h-3 animate-spin" />
            : <Check className="w-3 h-3" />}
          {isSaving ? 'Saving…' : isDirty ? 'Unsaved' : 'Saved'}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Device toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setPreviewDevice('desktop')}
            title="Desktop"
            className={clsx(
              'p-1.5 transition-colors',
              previewDevice === 'desktop'
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            title="Mobile"
            className={clsx(
              'p-1.5 transition-colors',
              previewDevice === 'mobile'
                ? 'bg-gray-900 text-white'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Buy PRO */}
        <button
          onClick={() => toast('Upgrade to PRO for custom domains, branding removal & more!', { icon: '⚡' })}
          className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded-lg transition-colors ml-1"
        >
          ⚡ PRO
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        {selected ? (
          <div
            className={clsx(
              'rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-200',
              previewDevice === 'mobile' ? 'w-80' : 'w-full max-w-xl'
            )}
            style={{
              fontFamily: form?.theme?.fontFamily ?? 'Inter, system-ui, sans-serif',
              backgroundColor: bgColor ?? '#FFFFFF',
              textAlign,
            }}
          >
            {/* Progress bar */}
            {selected.type !== 'thank_you_screen' && mainBlocks.length > 0 && (
              <div className="h-1" style={{ backgroundColor: `${primary}33` }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${((Math.max(currentIndex, 0) + 1) / mainBlocks.length) * 100}%`,
                    backgroundColor: primary,
                  }}
                />
              </div>
            )}

            <div className="p-8 min-h-[320px] flex flex-col">
              <BlockPreview
                question={selected}
                primary={primary}
                questionColor={questionColor}
                index={currentIndex}
                total={mainBlocks.length}
              />
            </div>
          </div>
        ) : (
          <div className="text-center select-none">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center mx-auto mb-4 text-2xl">
              👆
            </div>
            <p className="text-sm font-semibold text-gray-500">Select a block to preview</p>
            <p className="text-xs text-gray-400 mt-1">
              Or click <strong className="font-semibold">+ Add block</strong> to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Block preview (WYSIWYG, non-interactive) ──────────────────────────────────
function BlockPreview({ question, primary, questionColor, index, total }) {
  const qc = questionColor ?? '#111111';

  if (question.type === 'welcome_screen') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-3 leading-tight text-balance" style={{ color: qc }}>
          {question.title || <span className="opacity-30 italic">Welcome title…</span>}
        </h1>
        {question.config?.description && (
          <p className="mb-8 text-sm leading-relaxed opacity-70" style={{ color: qc }}>{question.config.description}</p>
        )}
        <button
          className="px-8 py-2.5 rounded-xl font-medium text-sm cursor-default select-none"
          style={{ backgroundColor: primary, color: '#fff' }}
        >
          {question.config?.buttonLabel ?? 'Start'}
        </button>
      </div>
    );
  }

  if (question.type === 'thank_you_screen') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-semibold mb-2 text-balance" style={{ color: qc }}>
          {question.title || 'Thank you!'}
        </h2>
        <p className="text-sm opacity-60" style={{ color: qc }}>{question.config?.message ?? 'Your response has been recorded.'}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {total > 0 && index >= 0 && (
        <p className="text-xs opacity-40 mb-2" style={{ color: qc }}>{index + 1} / {total}</p>
      )}
      <h2 className="text-xl font-semibold mb-1 leading-snug text-balance" style={{ color: qc }}>
        {question.title || <span className="opacity-30 italic">Question text…</span>}
        {question.required && <span className="text-red-400 ml-1">*</span>}
      </h2>
      {question.description && (
        <p className="text-sm mb-4 leading-relaxed opacity-60" style={{ color: qc }}>{question.description}</p>
      )}
      <div className="mt-4 pointer-events-none select-none">
        <AnswerPreview question={question} primary={primary} />
      </div>
      <div className="mt-auto pt-6 flex items-center justify-between">
        <span className="text-xs opacity-30" style={{ color: qc }}>← Back</span>
        <button
          className="px-5 py-2 rounded-lg text-sm font-medium cursor-default"
          style={{ backgroundColor: primary, color: '#fff' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function AnswerPreview({ question, primary }) {
  const { type, config } = question;

  if (type === 'short_text' || type === 'email' || type === 'phone' || type === 'number') {
    return (
      <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400">
        {config?.placeholder || (
          type === 'email' ? 'you@example.com'
          : type === 'phone' ? '+1 (555) 000-0000'
          : 'Type your answer…'
        )}
      </div>
    );
  }

  if (type === 'long_text') {
    return (
      <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 h-24">
        {config?.placeholder || 'Type your answer…'}
      </div>
    );
  }

  if (type === 'multiple_choice') {
    const choices = config?.choices?.slice(0, 4) ?? [];
    return (
      <div className="space-y-2">
        {choices.length === 0 ? (
          <div className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-300 italic">
            Option 1
          </div>
        ) : (
          choices.map(c => (
            <div key={c.id} className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600">
              {c.label}
            </div>
          ))
        )}
      </div>
    );
  }

  if (type === 'dropdown') {
    return (
      <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-between">
        <span>Select an option…</span>
        <span className="text-gray-300">▾</span>
      </div>
    );
  }

  if (type === 'yes_no') {
    return (
      <div className="flex gap-3">
        <div className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-center text-gray-500">👍 Yes</div>
        <div className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-center text-gray-500">👎 No</div>
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
          <span key={i} className="text-2xl opacity-25">{icon}</span>
        ))}
      </div>
    );
  }

  if (type === 'nps') {
    return (
      <div>
        <div className="flex gap-1 flex-wrap">
          {[...Array(11)].map((_, i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-lg text-sm border-2 border-gray-200 text-gray-400 flex items-center justify-center"
            >
              {i}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">{config?.lowLabel ?? 'Not likely'}</span>
          <span className="text-xs text-gray-400">{config?.highLabel ?? 'Extremely likely'}</span>
        </div>
      </div>
    );
  }

  if (type === 'date') return <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400">mm / dd / yyyy</div>;
  if (type === 'time') return <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400">-- : -- --</div>;

  if (type === 'file_upload') {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
        <p className="text-2xl mb-1">📎</p>
        <p className="text-sm text-gray-400">Click to upload or drag & drop</p>
        <p className="text-xs text-gray-300 mt-1">Max {config?.maxSizeMb ?? 10}MB</p>
      </div>
    );
  }

  if (type === 'statement') {
    return (
      <p className="text-gray-600 text-base leading-relaxed">
        {config?.content || question.description || 'Statement text…'}
      </p>
    );
  }

  return <p className="text-xs text-gray-400 italic py-4">Preview for "{type}"</p>;
}
