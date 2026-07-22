import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Search, Loader } from 'lucide-react';
import { nanoid } from 'nanoid';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { TEMPLATES, CATEGORIES, getTemplatesByCategory } from '@/lib/templates';
import { getTemplateTheme } from '@/lib/templateThemes';
import AppShell from '@/components/ui/AppShell';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };
const CATEGORY_LABELS = { forms: 'Form', surveys: 'Survey', quizzes: 'Quiz' };

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { activeWorkspaceId, workspaces } = useWorkspaceStore();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(null);

  const myRole = workspaces.find(w => w.id === activeWorkspaceId)?.role ?? 'viewer';
  const canEdit = ['owner', 'admin', 'editor'].includes(myRole);

  useEffect(() => {
    if (workspaces.length > 0 && !canEdit) {
      navigate('/dashboard', { replace: true });
    }
  }, [canEdit, workspaces.length]);

  const createMutation = useMutation({
    mutationFn: async ({ template }) => {
      if (!activeWorkspaceId) throw new Error('No workspace found.');
      const { form } = await api.forms.create(activeWorkspaceId, {
        title: template ? template.title : 'Untitled form',
      });
      if (template) {
        const questions = template.questions.map(({ _isNew, ...q }, i) => ({
          ...q,
          id: q.id ?? nanoid(),
          position: i,
        }));
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
      <div className="max-w-6xl mx-auto px-5 py-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#111]" style={SG}>Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            {TEMPLATES.length} ready-to-use templates — pick one and customise it in minutes.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all',
                  category === cat.id
                    ? 'bg-[#111] text-white border-[#111]'
                    : 'bg-white text-[#111] border-[#111] hover:-translate-y-px'
                )}
                style={{ ...SG, boxShadow: category === cat.id ? '3px 3px 0 #f97316' : '3px 3px 0 #111' }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm border-2 border-[#111] rounded-lg outline-none focus:border-[#f97316] bg-white w-56 transition-colors"
              style={SG}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

          {/* Start blank */}
          <TemplateCard
            templateId="blank"
            title="Start blank"
            description="Build your form from scratch with full control"
            color="#F3F4F6"
            textColor="#374151"
            isBlank
            loading={creating === 'blank'}
            disabled={!!creating}
            onClick={() => handleUse(null)}
          />

          {filtered.map(tpl => (
            <TemplateCard
              key={tpl.id}
              templateId={tpl.id}
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
            <p className="text-gray-400 text-sm">
              No templates match "<strong className="text-gray-600">{search}</strong>"
            </p>
            <button
              onClick={() => setSearch('')}
              className="text-[#f97316] text-sm mt-2 hover:underline font-bold"
              style={SG}
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TemplateCard({ templateId, title, description, color, textColor, questionCount, category, isBlank, loading, disabled, onClick }) {
  const Theme = getTemplateTheme(templateId);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={clsx(
        'group rounded-xl border-2 border-[#111] overflow-hidden bg-white transition-all duration-150',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:-translate-y-1',
        loading ? 'ring-2 ring-[#f97316]' : ''
      )}
      style={{ boxShadow: loading ? '4px 4px 0 #f97316' : '4px 4px 0 #111' }}
    >
      {/* Illustration area */}
      <div className="h-36 relative overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: color }}>
            <Loader className="w-7 h-7 animate-spin text-[#111]" />
          </div>
        ) : (
          <>
            <Theme color={color} textColor={textColor} />
            {/* Hover overlay */}
            {!isBlank && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
                style={{ background: `${color}dd` }}
              >
                <button
                  className="px-5 py-2 rounded-lg text-sm font-bold border-2 border-[#111] transition-transform group-hover:scale-105"
                  style={{ background: textColor, color: '#fff', boxShadow: '3px 3px 0 #111', ...SG }}
                >
                  Use template →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Card info */}
      <div className="p-4 border-t-2 border-[#111]">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-[#111] leading-snug" style={SG}>{title}</h3>
          {category && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md border-2 border-[#111] shrink-0"
              style={{ background: color, color: textColor }}
            >
              {CATEGORY_LABELS[category] ?? category}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{description}</p>
        {questionCount != null && (
          <p className="text-[11px] text-gray-400 mt-2 font-medium">{questionCount} questions</p>
        )}
        {isBlank && (
          <p className="text-[11px] text-[#f97316] mt-2 font-bold" style={SG}>Start from scratch →</p>
        )}
      </div>
    </div>
  );
}
