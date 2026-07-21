import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, Loader, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { TEMPLATES, CATEGORIES, getTemplatesByCategory } from '@/lib/templates';
import AppShell from '@/components/ui/AppShell';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(null);

  const createMutation = useMutation({
    mutationFn: async ({ template }) => {
      if (!activeWorkspaceId) throw new Error('No workspace found.');

      const { form } = await api.forms.create(activeWorkspaceId, {
        title: template ? template.title : 'Untitled form',
      });

      if (template) {
        const questions = template.questions.map(({ _isNew, ...q }) => q);
        await api.forms.saveQuestions(form.id, questions);
      }

      return form;
    },
    onSuccess: (form) => {
      toast.success('Form created!');
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

  const filtered = getTemplatesByCategory(category).filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            {TEMPLATES.length} ready-to-use templates across forms, surveys, and quizzes. Pick one and customise it in minutes.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={clsx(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                  category === cat.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 bg-white w-56 transition-colors"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

          {/* Start blank */}
          <TemplateCard
            icon={<FileText className="w-8 h-8 text-gray-300" />}
            title="Start blank"
            description="Build your form from scratch with full control"
            color="#F9FAFB"
            textColor="#374151"
            questionCount={null}
            isBlank
            loading={creating === 'blank'}
            disabled={!!creating}
            onClick={() => handleUse(null)}
          />

          {filtered.map(tpl => (
            <TemplateCard
              key={tpl.id}
              icon={<span className="text-4xl leading-none">{tpl.icon}</span>}
              title={tpl.title}
              description={tpl.description}
              color={tpl.color}
              textColor={tpl.textColor}
              questionCount={tpl.questions.length}
              category={tpl.category}
              loading={creating === tpl.id}
              disabled={!!creating}
              onClick={() => handleUse(tpl)}
            />
          ))}
        </div>

        {filtered.length === 0 && search && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No templates match "<strong className="text-gray-600">{search}</strong>"</p>
            <button onClick={() => setSearch('')} className="text-brand-500 text-sm mt-2 hover:underline">Clear search</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const CATEGORY_LABELS = { forms: 'Form', surveys: 'Survey', quizzes: 'Quiz' };

function TemplateCard({ icon, title, description, color, textColor, questionCount, category, isBlank, loading, disabled, onClick }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={clsx(
        'group rounded-2xl border-2 overflow-hidden bg-white transition-all duration-150',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        loading
          ? 'border-brand-400 shadow-lg ring-2 ring-brand-100'
          : isBlank
            ? 'border-dashed border-gray-200 hover:border-brand-300 hover:shadow-md'
            : 'border-transparent hover:border-brand-400 hover:shadow-lg'
      )}
    >
      {/* Preview area */}
      <div
        className="h-36 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: isBlank ? '#F3F4F6' : color }}
      >
        {loading ? (
          <Loader className="w-7 h-7 animate-spin text-brand-500" />
        ) : (
          <>
            {icon}
            {!isBlank && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
                style={{ background: `${color}cc` }}
              >
                <button
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-transform group-hover:scale-105"
                  style={{ background: textColor, color: '#fff' }}
                >
                  Use template →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{title}</h3>
          {category && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
              {CATEGORY_LABELS[category] ?? category}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{description}</p>
        {questionCount !== null && (
          <p className="text-xs text-gray-300 mt-2">{questionCount} questions</p>
        )}
        {isBlank && (
          <p className="text-xs text-brand-500 mt-2 font-medium">Start from scratch →</p>
        )}
      </div>
    </div>
  );
}
