import { useBuilderStore } from '@/stores/builderStore';
import { QUESTION_META } from './questionMeta';

const TYPES = [
  'welcome_screen', 'short_text', 'long_text', 'multiple_choice', 'picture_choice',
  'dropdown', 'rating', 'nps', 'yes_no', 'email', 'phone', 'number', 'date',
  'file_upload', 'signature', 'thank_you_screen',
];

export default function AddQuestionPanel() {
  const { addQuestion, selectedQuestionId } = useBuilderStore();
  return (
    <aside className="w-52 bg-white border-r border-gray-100 overflow-y-auto shrink-0 p-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-2">Add question</p>
      {TYPES.map(type => {
        const meta = QUESTION_META[type];
        if (!meta) return null;
        const { Icon, label, color } = meta;
        return (
          <button
            key={type}
            onClick={() => addQuestion(type, selectedQuestionId)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 text-gray-700 transition-colors group"
          >
            <span className="w-5 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </span>
            <span className="text-xs font-medium group-hover:text-gray-900">{label}</span>
          </button>
        );
      })}
    </aside>
  );
}
