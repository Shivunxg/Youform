import { useBuilderStore } from '@/stores/builderStore';
const TYPES = [
  { type: 'welcome_screen', label: 'Welcome screen', icon: '👋' },
  { type: 'short_text', label: 'Short text', icon: '✏️' },
  { type: 'long_text', label: 'Long text', icon: '📄' },
  { type: 'multiple_choice', label: 'Multiple choice', icon: '☑️' },
  { type: 'dropdown', label: 'Dropdown', icon: '▾' },
  { type: 'rating', label: 'Rating', icon: '⭐' },
  { type: 'nps', label: 'NPS', icon: '📊' },
  { type: 'yes_no', label: 'Yes / No', icon: '✅' },
  { type: 'email', label: 'Email', icon: '✉️' },
  { type: 'phone', label: 'Phone', icon: '📞' },
  { type: 'number', label: 'Number', icon: '🔢' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'file_upload', label: 'File upload', icon: '📎' },
  { type: 'thank_you_screen', label: 'Thank you', icon: '🎉' },
];
export default function AddQuestionPanel() {
  const { addQuestion, selectedQuestionId } = useBuilderStore();
  return (
    <aside className="w-52 bg-white border-r border-gray-100 overflow-y-auto shrink-0 p-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-2">Add question</p>
      {TYPES.map(({ type, label, icon }) => (
        <button key={type} onClick={() => addQuestion(type, selectedQuestionId)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-brand-50 hover:text-brand-700 text-gray-700 transition-colors">
          <span className="text-base w-5 text-center">{icon}</span>
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </aside>
  );
}
