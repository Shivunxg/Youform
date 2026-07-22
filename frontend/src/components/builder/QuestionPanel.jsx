import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Plus, Trash2, X, GitBranch } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { QUESTION_META } from './questionMeta';
import { clsx } from 'clsx';

export default function QuestionPanel() {
  const { getSelectedQuestion, updateQuestion, updateQuestionConfig, deselect, form } = useBuilderStore();
  const question = getSelectedQuestion();
  const quizMode = form?.settings?.quizMode ?? false;

  if (!question) {
    return (
      <aside className="w-72 bg-white border-l border-gray-100 flex items-center justify-center shrink-0">
        <p className="text-xs text-gray-400">Select a question to edit</p>
      </aside>
    );
  }

  const meta = QUESTION_META[question.type] ?? {};

  return (
    <aside className="w-72 bg-white border-l border-gray-100 overflow-y-auto shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-1.5">
          <span>{meta.icon}</span>
          <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
        </div>
        <button onClick={deselect} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Question title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
          <textarea
            rows={2}
            className="input resize-none text-sm"
            placeholder="Your question…"
            value={question.title}
            onChange={e => updateQuestion(question.id, { title: e.target.value })}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            rows={2}
            className="input resize-none text-sm"
            placeholder="Add a hint or extra detail…"
            value={question.description ?? ''}
            onChange={e => updateQuestion(question.id, { description: e.target.value })}
          />
        </div>

        {/* Required toggle */}
        <Toggle
          label="Required"
          hint="Respondents must answer this"
          checked={question.required}
          onChange={v => updateQuestion(question.id, { required: v })}
        />

        {/* Type-specific config */}
        <TypeConfig question={question} onConfig={updateQuestionConfig} quizMode={quizMode} />

        {/* Logic */}
        {!['welcome_screen', 'thank_you_screen', 'statement'].includes(question.type) && (
          <LogicEditor question={question} onUpdate={updateQuestion} />
        )}
      </div>
    </aside>
  );
}

// ── Type-specific config renderers ─────────────────────────────────────────

function TypeConfig({ question, onConfig, quizMode }) {
  const update = (updates) => onConfig(question.id, updates);
  const { type, config } = question;

  if (type === 'multiple_choice' || type === 'dropdown') {
    return <ChoicesConfig config={config} onConfig={update} allowMultiple={type === 'multiple_choice'} quizMode={quizMode} />;
  }
  if (type === 'yes_no' && quizMode) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-600">Quiz scores</p>
        {['Yes', 'No'].map(opt => (
          <div key={opt} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-8">{opt}</span>
            <input
              type="number"
              className="input text-xs py-1 w-20"
              placeholder="0"
              value={config.scores?.[opt] ?? ''}
              onChange={e => update({ scores: { ...(config.scores ?? {}), [opt]: e.target.value === '' ? undefined : +e.target.value } })}
            />
            <span className="text-xs text-gray-400">pts</span>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'rating') {
    return (
      <div className="space-y-3">
        <SelectField
          label="Number of steps"
          value={config.steps ?? 5}
          onChange={v => update({ steps: +v })}
          options={[3,4,5,6,7,8,9,10].map(n => ({ value: n, label: String(n) }))}
        />
        <SelectField
          label="Shape"
          value={config.shape ?? 'star'}
          onChange={v => update({ shape: v })}
          options={[{ value: 'star', label: '⭐ Star' }, { value: 'heart', label: '❤️ Heart' }, { value: 'thumb', label: '👍 Thumb' }, { value: 'circle', label: '⬤ Circle' }]}
        />
      </div>
    );
  }
  if (type === 'nps') {
    return (
      <div className="space-y-3">
        <InputField label="Low label" value={config.lowLabel ?? ''} onChange={v => update({ lowLabel: v })} placeholder="Not likely" />
        <InputField label="High label" value={config.highLabel ?? ''} onChange={v => update({ highLabel: v })} placeholder="Extremely likely" />
      </div>
    );
  }
  if (type === 'short_text' || type === 'long_text') {
    return (
      <div className="space-y-3">
        <InputField label="Placeholder" value={config.placeholder ?? ''} onChange={v => update({ placeholder: v })} placeholder="Placeholder text…" />
        <InputField label="Max characters" type="number" value={config.maxLength ?? ''} onChange={v => update({ maxLength: v ? +v : null })} placeholder="No limit" />
      </div>
    );
  }
  if (type === 'file_upload') {
    return (
      <div className="space-y-3">
        <InputField label="Max file size (MB)" type="number" value={config.maxSizeMb ?? 10} onChange={v => update({ maxSizeMb: +v })} />
        <InputField label="Max number of files" type="number" value={config.maxFiles ?? 1} onChange={v => update({ maxFiles: +v })} />
      </div>
    );
  }
  if (type === 'welcome_screen') {
    return (
      <div className="space-y-3">
        <InputField label="Button label" value={config.buttonLabel ?? 'Start'} onChange={v => update({ buttonLabel: v })} />
        <TextareaField label="Description" value={config.description ?? ''} onChange={v => update({ description: v })} />
      </div>
    );
  }
  if (type === 'thank_you_screen') {
    return (
      <div className="space-y-3">
        <TextareaField label="Message" value={config.message ?? ''} onChange={v => update({ message: v })} placeholder="Thank you for your response!" />
        <InputField label="Redirect URL (optional)" value={config.redirectUrl ?? ''} onChange={v => update({ redirectUrl: v })} placeholder="https://…" />
      </div>
    );
  }
  if (type === 'matrix') {
    return <MatrixConfig config={config} onConfig={update} />;
  }
  if (type === 'number') {
    return (
      <div className="space-y-3">
        <InputField label="Placeholder" value={config.placeholder ?? ''} onChange={v => update({ placeholder: v })} />
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Min" type="number" value={config.min ?? ''} onChange={v => update({ min: v ? +v : null })} />
          <InputField label="Max" type="number" value={config.max ?? ''} onChange={v => update({ max: v ? +v : null })} />
        </div>
      </div>
    );
  }
  if (type === 'ranking') {
    return <RankingConfig config={config} onConfig={update} />;
  }
  if (type === 'payment') {
    return (
      <div className="space-y-3">
        <SelectField label="Currency" value={config.currency ?? 'USD'} onChange={v => update({ currency: v })}
          options={['USD','INR','EUR','GBP','AUD','CAD','SGD'].map(c => ({ value: c, label: c }))} />
        <InputField label="Fixed amount" type="number" value={config.amount ?? ''} onChange={v => update({ amount: v ? +v : null })} placeholder="Leave blank for variable" />
      </div>
    );
  }
  return null;
}

// ── Logic Editor ───────────────────────────────────────────────────────────

const OPERATORS = [
  { value: 'eq',       label: 'equals' },
  { value: 'neq',      label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'gt',       label: 'is greater than' },
  { value: 'lt',       label: 'is less than' },
  { value: 'answered', label: 'is answered' },
];

function LogicEditor({ question, onUpdate }) {
  const { questions, logicPanelOpen, closeLogicPanel } = useBuilderStore();
  const [open, setOpen] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (logicPanelOpen) {
      setOpen(true);
      setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [logicPanelOpen]);

  const rules = question.logic ?? [];
  const hasRules = rules.length > 0;

  const addRule = () => {
    const nextQ = questions.find(q => q.id !== question.id && !['welcome_screen', 'thank_you_screen'].includes(q.type));
    const newRule = { id: nanoid(), condition: { op: 'eq', value: '' }, target: nextQ?.id ?? 'end' };
    onUpdate(question.id, { logic: [...rules, newRule] });
  };

  const updateRule = (ruleId, patch) => {
    onUpdate(question.id, { logic: rules.map(r => r.id === ruleId ? { ...r, ...patch } : r) });
  };

  const deleteRule = (ruleId) => {
    onUpdate(question.id, { logic: rules.filter(r => r.id !== ruleId) });
  };

  const answerableQuestions = questions.filter(q =>
    !['welcome_screen', 'thank_you_screen', 'statement'].includes(q.type)
  );

  const targetOptions = [
    ...answerableQuestions
      .filter(q => q.id !== question.id)
      .map(q => ({ value: q.id, label: (q.title?.slice(0, 40) || 'Untitled question') })),
    { value: 'end', label: '→ Submit form' },
  ];

  return (
    <div ref={sectionRef} className="border-t border-gray-100 pt-4 mt-2">
      <button
        onClick={() => { setOpen(v => !v); if (open) closeLogicPanel(); }}
        className="flex items-center gap-2 w-full text-left"
      >
        <GitBranch className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-xs font-medium text-gray-600 flex-1">Logic</span>
        {hasRules && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-600">
            {rules.length} rule{rules.length !== 1 ? 's' : ''}
          </span>
        )}
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {rules.length === 0 ? (
            <p className="text-xs text-gray-400">No logic rules yet. Add a rule to skip or jump based on the answer.</p>
          ) : (
            rules.map((rule, i) => (
              <div key={rule.id} className="bg-gray-50 rounded-lg p-2.5 space-y-2 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">If answer…</span>
                  <button onClick={() => deleteRule(rule.id)} className="p-0.5 text-gray-300 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <select
                  className="input text-xs py-1"
                  value={rule.condition.op}
                  onChange={e => updateRule(rule.id, { condition: { ...rule.condition, op: e.target.value } })}
                >
                  {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {rule.condition.op !== 'answered' && (
                  <input
                    className="input text-xs py-1"
                    placeholder="Value…"
                    value={rule.condition.value ?? ''}
                    onChange={e => updateRule(rule.id, { condition: { ...rule.condition, value: e.target.value } })}
                  />
                )}

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Then jump to…</span>
                  <select
                    className="input text-xs py-1"
                    value={rule.target ?? 'end'}
                    onChange={e => updateRule(rule.id, { target: e.target.value })}
                  >
                    {targetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            ))
          )}

          <button onClick={addRule} className="btn-ghost text-xs w-full justify-center py-1.5 border border-dashed border-gray-200">
            <Plus className="w-3.5 h-3.5" /> Add rule
          </button>

          {hasRules && (
            <p className="text-[10px] text-gray-400">Rules are evaluated top to bottom. If no rule matches, the next question is shown.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ChoicesConfig({ config, onConfig, allowMultiple, quizMode }) {
  const choices = config.choices ?? [];
  const addChoice = () => onConfig({ choices: [...choices, { id: nanoid(), label: '' }] });
  const removeChoice = (id) => onConfig({ choices: choices.filter(c => c.id !== id) });
  const updateChoice = (id, label) => onConfig({ choices: choices.map(c => c.id === id ? { ...c, label } : c) });
  const updateScore = (id, val) => onConfig({ scores: { ...(config.scores ?? {}), [id]: val === '' ? undefined : +val } });

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">Choices {quizMode && <span className="text-[10px] text-[#f97316] font-bold ml-1">+ Score</span>}</label>
      <div className="space-y-1.5">
        {choices.map(c => (
          <div key={c.id} className="flex items-center gap-1.5">
            <input
              className="input text-sm py-1.5 flex-1"
              value={c.label}
              onChange={e => updateChoice(c.id, e.target.value)}
              placeholder="Option label"
            />
            {quizMode && (
              <input
                type="number"
                className="input text-xs py-1.5 w-14 text-center"
                placeholder="0"
                title="Score for this choice"
                value={config.scores?.[c.id] ?? ''}
                onChange={e => updateScore(c.id, e.target.value)}
              />
            )}
            <button onClick={() => removeChoice(c.id)} className="p-1 text-gray-300 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {quizMode && choices.length > 0 && (
        <p className="text-[10px] text-gray-400">Score inputs are in points (leave blank for 0)</p>
      )}
      <button onClick={addChoice} className="btn-ghost text-xs w-full justify-center py-1.5 border border-dashed border-gray-200">
        <Plus className="w-3.5 h-3.5" /> Add option
      </button>
      {allowMultiple && (
        <Toggle label="Allow multiple selections" checked={config.allowMultiple ?? false} onChange={v => onConfig({ allowMultiple: v })} />
      )}
      <Toggle label="Allow 'Other' option" checked={config.allowOther ?? false} onChange={v => onConfig({ allowOther: v })} />
    </div>
  );
}

function MatrixConfig({ config, onConfig }) {
  const rows = config.rows ?? [];
  const cols = config.columns ?? [];
  return (
    <div className="space-y-3">
      <EditableList label="Rows" items={rows} onChange={v => onConfig({ rows: v })} placeholder="Row label" />
      <EditableList label="Columns" items={cols} onChange={v => onConfig({ columns: v })} placeholder="Column label" />
    </div>
  );
}

function RankingConfig({ config, onConfig }) {
  const items = config.items ?? [];
  const addItem = () => onConfig({ items: [...items, { id: nanoid(), label: '' }] });
  const removeItem = (id) => onConfig({ items: items.filter(i => i.id !== id) });
  const updateItem = (id, label) => onConfig({ items: items.map(i => i.id === id ? { ...i, label } : i) });
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">Items to rank</label>
      {items.map(item => (
        <div key={item.id} className="flex gap-1.5">
          <input className="input text-sm py-1.5 flex-1" value={item.label} onChange={e => updateItem(item.id, e.target.value)} />
          <button onClick={() => removeItem(item.id)} className="p-1 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={addItem} className="btn-ghost text-xs w-full justify-center py-1.5 border border-dashed border-gray-200"><Plus className="w-3.5 h-3.5" />Add item</button>
    </div>
  );
}

function EditableList({ label, items, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <input className="input text-sm py-1.5 flex-1" value={item} onChange={e => { const copy = [...items]; copy[i] = e.target.value; onChange(copy); }} placeholder={placeholder} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="btn-ghost text-xs w-full justify-center py-1.5 border border-dashed border-gray-200"><Plus className="w-3.5 h-3.5" />Add</button>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────

function Toggle({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          checked ? 'bg-brand-500' : 'bg-gray-200'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} className="input text-sm py-1.5" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea rows={3} className="input resize-none text-sm" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select className="input text-sm py-1.5" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
