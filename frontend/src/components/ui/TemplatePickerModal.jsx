import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { X, Search, Loader, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { TEMPLATES, CATEGORIES, getTemplatesByCategory } from '@/lib/templates';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function TemplatePickerModal({ onClose }) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(null); // template id being created

  const createMutation = useMutation({
    mutationFn: async ({ template }) => {
      let wsId = activeWorkspaceId;
      if (!wsId) throw new Error('No workspace found.');

      // 1. Create the form
      const { form } = await api.forms.create(wsId, {
        title: template ? template.title : 'Untitled form',
      });

      // 2. If a template was chosen, save its questions
      if (template) {
        const questions = template.questions.map(({ _isNew, ...q }) => q);
        await api.forms.saveQuestions(form.id, questions);
      }

      return form;
    },
    onSuccess: (form) => {
      toast.success('Form created!');
      onClose();
      navigate(`/forms/${form.id}/builder`);
    },
    onError: (err) => {
      toast.error(err.message || 'Could not create form');
      setCreating(null);
    },
  });

  function handleUse(template) {
    setCreating(template?.id ?? 'blank');
    createMutation.mutate({ template: template ?? null });
  }

  const templates = getTemplatesByCategory(category).filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Start from a template</h2>
              <p className="text-sm text-gray-400 mt-0.5">Pick a template or start from scratch — you can edit everything.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 shrink-0">
            {/* Category tabs */}
            <div className="flex items-center gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                    category === cat.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative ml-auto w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors bg-gray-50"
              />
            </div>
          </div>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

              {/* Start blank */}
              <TemplateCard
                icon={<FileText className="w-7 h-7 text-gray-400" />}
                title="Start blank"
                description="Build your form from scratch"
                color="#F3F4F6"
                textColor="#374151"
                questionCount={null}
                isBlank
                loading={creating === 'blank'}
                disabled={!!creating}
                onClick={() => handleUse(null)}
              />

              {/* Template cards */}
              {templates.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  icon={<span className="text-3xl leading-none">{tpl.icon}</span>}
                  title={tpl.title}
                  description={tpl.description}
                  color={tpl.color}
                  textColor={tpl.textColor}
                  questionCount={tpl.questions.length}
                  loading={creating === tpl.id}
                  disabled={!!creating}
                  onClick={() => handleUse(tpl)}
                />
              ))}
            </div>

            {templates.length === 0 && search && (
              <div className="text-center py-16 text-sm text-gray-400">
                No templates match "<strong>{search}</strong>"
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TemplateCard({ icon, title, description, color, textColor, questionCount, isBlank, loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'group text-left rounded-xl border-2 overflow-hidden transition-all duration-150',
        'disabled:cursor-not-allowed',
        loading
          ? 'border-brand-400 shadow-lg shadow-brand-100 scale-[1.02]'
          : isBlank
            ? 'border-dashed border-gray-300 hover:border-brand-400 hover:shadow-md'
            : 'border-transparent hover:border-brand-400 hover:shadow-md'
      )}
    >
      {/* Preview */}
      <div
        className="h-28 flex flex-col items-center justify-center gap-2 relative overflow-hidden"
        style={{ background: isBlank ? '#F9FAFB' : color }}
      >
        {loading ? (
          <Loader className="w-6 h-6 animate-spin text-brand-500" />
        ) : (
          <>
            {icon}
            {!isBlank && (
              <span
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `${color}e8` }}
              >
                <span
                  className="px-4 py-2 rounded-lg text-sm font-700 font-semibold shadow-sm border"
                  style={{ background: textColor, color: '#fff', borderColor: textColor }}
                >
                  Use template
                </span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-white">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{description}</p>
        {questionCount !== null && (
          <p className="text-xs text-gray-300 mt-1.5">{questionCount} questions</p>
        )}
      </div>
    </button>
  );
}
