import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Copy, Trash2 } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { clsx } from 'clsx';

const TYPE_META = {
  welcome_screen:   { icon: '👋', color: '#8B5CF6', label: 'Welcome screen' },
  short_text:       { icon: '✏️', color: '#9CA3AF', label: 'Short text' },
  long_text:        { icon: '📄', color: '#9CA3AF', label: 'Long text' },
  multiple_choice:  { icon: '☑️', color: '#EAB308', label: 'Multiple choice' },
  dropdown:         { icon: '▾',  color: '#3B82F6', label: 'Dropdown' },
  rating:           { icon: '⭐', color: '#F97316', label: 'Rating' },
  nps:              { icon: '📊', color: '#F97316', label: 'NPS Score' },
  yes_no:           { icon: '✅', color: '#10B981', label: 'Yes / No' },
  email:            { icon: '✉️', color: '#3B82F6', label: 'Email' },
  phone:            { icon: '📞', color: '#3B82F6', label: 'Phone' },
  number:           { icon: '🔢', color: '#9CA3AF', label: 'Number' },
  date:             { icon: '📅', color: '#8B5CF6', label: 'Date' },
  time:             { icon: '⏰', color: '#8B5CF6', label: 'Time' },
  file_upload:      { icon: '📎', color: '#F97316', label: 'File upload' },
  statement:        { icon: '💬', color: '#9CA3AF', label: 'Statement' },
  thank_you_screen: { icon: '🎉', color: '#10B981', label: 'Thank you' },
};

export const ADD_BLOCK_TYPES = [
  { type: 'welcome_screen', label: 'Welcome screen', icon: '👋' },
  { type: 'short_text',     label: 'Short text',     icon: '✏️' },
  { type: 'long_text',      label: 'Long text',       icon: '📄' },
  { type: 'multiple_choice',label: 'Multiple choice', icon: '☑️' },
  { type: 'dropdown',       label: 'Dropdown',        icon: '▾' },
  { type: 'rating',         label: 'Rating',          icon: '⭐' },
  { type: 'nps',            label: 'NPS Score',       icon: '📊' },
  { type: 'yes_no',         label: 'Yes / No',        icon: '✅' },
  { type: 'email',          label: 'Email',           icon: '✉️' },
  { type: 'phone',          label: 'Phone',           icon: '📞' },
  { type: 'number',         label: 'Number',          icon: '🔢' },
  { type: 'date',           label: 'Date',            icon: '📅' },
  { type: 'file_upload',    label: 'File upload',     icon: '📎' },
  { type: 'statement',      label: 'Statement',       icon: '💬' },
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
        {ADD_BLOCK_TYPES.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 hover:text-brand-700 text-left transition-colors group"
          >
            <span className="text-sm w-5 text-center shrink-0">{icon}</span>
            <span className="text-xs font-medium text-gray-700 group-hover:text-brand-700">{label}</span>
          </button>
        ))}
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
      {/* Sidebar header */}
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

      {/* Block list */}
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

        {/* Ending / Thank you section */}
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
  const meta = TYPE_META[question.type] ?? { icon: '❓', color: '#9CA3AF', label: question.type };

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
        isSelected
          ? 'bg-brand-50 shadow-sm ring-1 ring-inset ring-brand-200'
          : 'hover:bg-gray-50'
      )}
    >
      {/* Color bar */}
      <div
        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors"
        style={{ backgroundColor: isSelected ? meta.color : '#E5E7EB' }}
      />

      {/* Number badge (main blocks only) */}
      {!isTerminal ? (
        <div
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors"
          style={{
            background: isSelected ? meta.color : '#F3F4F6',
            color: isSelected ? '#fff' : '#9CA3AF',
          }}
        >
          {index + 1}
        </div>
      ) : (
        <span className="text-xs w-[18px] text-center shrink-0 leading-none">{meta.icon}</span>
      )}

      {/* Icon + text */}
      <div className="flex-1 min-w-0">
        {!isTerminal && (
          <span className="text-[11px] mr-1 leading-none">{meta.icon}</span>
        )}
        <span className={clsx('text-xs font-medium', question.title ? 'text-gray-800' : 'text-gray-400 italic')}>
          {question.title || 'Untitled'}
        </span>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{meta.label}</p>
      </div>

      {/* Hover actions */}
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
