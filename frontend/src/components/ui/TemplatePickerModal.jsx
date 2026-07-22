import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { X, Search, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { TEMPLATES, CATEGORIES, getTemplatesByCategory } from '@/lib/templates';
import { getTemplateTheme } from '@/lib/templateThemes';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

export default function TemplatePickerModal({ onClose }) {
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
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#111]/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#FFFBF2] rounded-2xl border-2 border-[#111] w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
          style={{ boxShadow: '8px 8px 0 #111' }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-[#111] shrink-0 bg-white">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#111]" style={SG}>Start from a template</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pick a template or start from scratch — everything is editable.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center text-[#111] hover:bg-[#FFFBF2] transition-colors"
              style={{ boxShadow: '2px 2px 0 #111' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b-2 border-[#111] shrink-0 bg-white flex-wrap">
            <div className="flex items-center gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-lg text-sm font-bold border-2 transition-all',
                    category === cat.id
                      ? 'bg-[#111] text-white border-[#111]'
                      : 'bg-white text-[#111] border-[#111] hover:-translate-y-px'
                  )}
                  style={{ ...SG, boxShadow: category === cat.id ? '3px 3px 0 #f97316' : '2px 2px 0 #111' }}
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
                className="pl-8 pr-4 py-1.5 text-sm border-2 border-[#111] rounded-lg outline-none focus:border-[#f97316] bg-white w-52 transition-colors"
                style={SG}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#FFFBF2]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

              {/* Start blank */}
              <MiniTemplateCard
                templateId="blank"
                title="Start blank"
                description="Build your form from scratch"
                color="#F3F4F6"
                textColor="#374151"
                isBlank
                loading={creating === 'blank'}
                disabled={!!creating}
                onClick={() => handleUse(null)}
              />

              {templates.map(tpl => (
                <MiniTemplateCard
                  key={tpl.id}
                  templateId={tpl.id}
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
                No templates match "<strong className="text-gray-600">{search}</strong>"
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MiniTemplateCard({ templateId, title, description, color, textColor, questionCount, isBlank, loading, disabled, onClick }) {
  const Theme = getTemplateTheme(templateId);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'group text-left rounded-xl border-2 border-[#111] overflow-hidden bg-white transition-all duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !disabled && 'hover:-translate-y-1'
      )}
      style={{ boxShadow: loading ? '4px 4px 0 #f97316' : '3px 3px 0 #111' }}
    >
      {/* Illustration */}
      <div className="h-28 relative overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: color }}>
            <Loader className="w-5 h-5 animate-spin text-[#111]" />
          </div>
        ) : (
          <>
            <Theme color={color} textColor={textColor} />
            {!isBlank && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ background: `${color}dd` }}
              >
                <span
                  className="px-4 py-1.5 rounded-lg text-xs font-bold border-2 border-[#111]"
                  style={{ background: textColor, color: '#fff', boxShadow: '2px 2px 0 #111', ...SG }}
                >
                  Use template →
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3 border-t-2 border-[#111]">
        <p className="text-sm font-bold text-[#111] leading-snug line-clamp-1" style={SG}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{description}</p>
        {questionCount != null && (
          <p className="text-[10px] text-gray-400 mt-1.5 font-medium">{questionCount} questions</p>
        )}
        {isBlank && (
          <p className="text-[10px] text-[#f97316] mt-1.5 font-bold" style={SG}>Start from scratch →</p>
        )}
      </div>
    </button>
  );
}
