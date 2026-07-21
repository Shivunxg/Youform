import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { clsx } from 'clsx';
const ICONS = { short_text:'✏️', long_text:'📄', multiple_choice:'☑️', dropdown:'▾', rating:'⭐', nps:'📊', yes_no:'✅', email:'✉️', phone:'📞', number:'🔢', date:'📅', file_upload:'📎', welcome_screen:'👋', thank_you_screen:'🎉', statement:'💬' };
export default function QuestionList() {
  const { questions } = useBuilderStore();
  if (questions.length === 0) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Add a question from the left panel</div>;
  return <div className="max-w-2xl mx-auto space-y-2 pb-20">{questions.map((q, i) => <SortableQuestion key={q.id} question={q} index={i} />)}</div>;
}
function SortableQuestion({ question, index }) {
  const { selectedQuestionId, selectQuestion, deleteQuestion, duplicateQuestion } = useBuilderStore();
  const isSelected = selectedQuestionId === question.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      onClick={() => selectQuestion(question.id)}
      className={clsx('group relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all', isSelected ? 'border-brand-400 shadow-md' : 'border-gray-200 hover:border-gray-300')}>
      <div className="absolute -left-3 top-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: isSelected ? '#6366f1' : '#e5e7eb', color: isSelected ? '#fff' : '#6b7280' }}>{index + 1}</div>
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab opacity-0 group-hover:opacity-100"><GripVertical className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1"><span className="text-xs">{ICONS[question.type] ?? '❓'}</span><span className="text-xs text-gray-400">{question.type}</span>{question.required && <span className="text-xs text-red-400">*</span>}</div>
          <p className={clsx('text-sm font-medium', question.title ? 'text-gray-900' : 'text-gray-400 italic')}>{question.title || 'Untitled question'}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={e => { e.stopPropagation(); duplicateQuestion(question.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={e => { e.stopPropagation(); deleteQuestion(question.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
