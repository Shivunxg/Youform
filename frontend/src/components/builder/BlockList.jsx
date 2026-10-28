import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Copy, Trash2 } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { QUESTION_META } from './questionMeta';
import { clsx } from 'clsx';

export const ADD_BLOCK_TYPES = [
  'welcome_screen', 'short_text', 'long_text', 'multiple_choice', 'dropdown',
  'rating', 'nps', 'yes_no', 'email', 'phone', 'number', 'date', 'file_upload', 'statement',
];

export function TypePickerDropdown({ onSelect, onClose, anchor = 'right' }) {
  return (
    <div className={clsx(
      'absolute top-8 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden',
      anchor === 'right' ? 'right-0' : 'left-0'
    )}>
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Block type</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
      </div>
      <div className="p-1 max-h-60 overflow-y-auto">
        {ADD_BLOCK_TYPES.map(type => {
          const meta = QUESTION_META[type];
          if (!meta) return null;
          const { Icon, label, color } = meta;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors group"
            >
              <span className="w-5 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BlockList() {
  const { questions, addQuestion, selectedQuestionId } = useBuilderStore();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  const mainBlocks = questions.filter(q => q.type !== 'thank_you_screen');
  const thankYouBlock = questions.find(q => q.type === 'thank_you_screen');

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleAdd = (type) => {
    addQuestion(type, selectedQuestionId);
    setShowPicker(false);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0">
      <div className="px-3 pt-2.5 pb-2 border-b border-gray-100 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Blocks</span>
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(v => !v)}
            className="w-6 h-6 rounded-md bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors"
            title="Add block"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {showPicker && (
            <TypePickerDropdown onSelect={handleAdd} onClose={() => setShowPicker(false)} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
        {mainBlocks.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xs text-gray-400 mb-2">No blocks yet</p>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs font-semibold text-brand-500 hover:text-brand-700"
            >
              + Add first block
            </button>
          </div>
        )}
        {mainBlocks.map((q, i) => (
          <BlockItem key={q.id} question={q} index={i} />
        ))}

        <div className="pt-2 mt-1 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1.5 mb-1">
            Ending
          </p>
          {thankYouBlock ? (
            <BlockItem question={thankYouBlock} index={-1} isTerminal />
          ) : (
            <button
              onClick={() => addQuestion('thank_you_screen', mainBlocks[mainBlocks.length - 1]?.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-brand-500 hover:bg-brand-50 border border-dashed border-gray-200 hover:border-brand-200 transition-all"
            >
              <Plus className="w-3 h-3" />
              Add thank you page
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function BlockItem({ question, index, isTerminal }) {
  const { selectedQuestionId, selectQuestion, deleteQuestion, duplicateQuestion } = useBuilderStore();
  const isSelected = selectedQuestionId === question.id;
  const meta = QUESTION_META[question.type] ?? { Icon: null, label: question.type };
  const { Icon } = meta;
  const iconColor = isSelected ? '#f97316' : '#94a3b8';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled: !!isTerminal,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      onClick={() => selectQuestion(question.id)}
      className={clsx(
        'group relative flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-lg cursor-pointer transition-all',
        isSelected ? 'bg-brand-50' : 'hover:bg-gray-50'
      )}
    >
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm transition-opacity"
        style={{ backgroundColor: '#f97316', opacity: isSelected ? 1 : 0 }}
      />

      {!isTerminal ? (
        <div
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors"
          style={{
            background: isSelected ? '#f97316' : '#F3F4F6',
            color: isSelected ? '#fff' : '#9CA3AF',
          }}
        >
          {index + 1}
        </div>
      ) : (
        <span className="w-[18px] flex items-center justify-center shrink-0">
          {Icon && <Icon className="w-3 h-3" style={{ color: iconColor }} />}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {!isTerminal && Icon && (
            <Icon className="w-3 h-3 shrink-0" style={{ color: iconColor }} />
          )}
          <span className={clsx('text-xs font-medium truncate', question.title ? 'text-gray-800' : 'text-gray-400 italic')}>
            {question.title || 'Untitled'}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{meta.label}</p>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isTerminal && (
          <>
            <span
              {...attributes}
              {...listeners}
              className="p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="w-3 h-3" />
            </span>
            <button
              onClick={e => { e.stopPropagation(); duplicateQuestion(question.id); }}
              className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </>
        )}
        <button
          onClick={e => { e.stopPropagation(); deleteQuestion(question.id); }}
          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
