import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Eye, EyeOff, Check, Loader } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'builder',   label: 'Build',     path: 'builder' },
  { id: 'logic',     label: 'Logic',     path: 'logic' },
  { id: 'integrate', label: 'Integrate', path: 'integrate' },
  { id: 'settings',  label: 'Settings',  path: 'settings' },
  { id: 'share',     label: 'Share',     path: 'share' },
  { id: 'responses', label: 'Results',   path: 'responses' },
];

export default function FormHeader({ staticTitle, isBuilder = false }) {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    form, isDirty, isSaving, previewMode,
    setPreviewMode, save, publish, updateForm,
  } = useBuilderStore();

  const activeTab = TABS.find(t => pathname.includes(`/${t.path}`))?.id ?? 'builder';

  const handleSave = async () => {
    try { await save(); toast.success('Saved'); }
    catch { toast.error('Save failed'); }
  };

  const handlePublish = async () => {
    try { await publish(); toast.success('Published! 🎉'); }
    catch (err) { toast.error(err.message || 'Publish failed'); }
  };

  const displayTitle = form?.title ?? staticTitle ?? 'Form';

  return (
    <header className="bg-white border-b border-gray-200 shrink-0 z-20">
      {/* Top row */}
      <div className="h-12 flex items-center px-4 gap-3">
        {/* Back to dashboard */}
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-ghost p-1.5 rounded-lg shrink-0"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Form title — editable only in builder */}
        {isBuilder && form ? (
          <input
            className="text-sm font-semibold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand-400 transition-colors min-w-0 max-w-xs"
            value={form.title}
            onChange={e => updateForm({ title: e.target.value })}
            placeholder="Untitled form"
          />
        ) : (
          <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">{displayTitle}</span>
        )}

        {/* Save status (builder only) */}
        {isBuilder && form && (
          <div className={clsx(
            'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
            isSaving
              ? 'text-amber-600 bg-amber-50'
              : isDirty
                ? 'text-amber-500 bg-amber-50'
                : 'text-emerald-600 bg-emerald-50'
          )}>
            {isSaving ? <Loader className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
            {isSaving ? 'Saving…' : isDirty ? 'Unsaved' : 'Saved'}
          </div>
        )}

        <div className="flex-1" />

        {/* Builder-only actions */}
        {isBuilder && form && (
          <>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="btn-secondary text-xs h-8 px-3 gap-1.5"
            >
              {previewMode
                ? <><EyeOff className="w-3.5 h-3.5" />Edit</>
                : <><Eye className="w-3.5 h-3.5" />Preview</>}
            </button>

            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="btn-secondary text-xs h-8 px-3 gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />Save
            </button>

            <button onClick={handlePublish} className="btn-primary text-xs h-8 px-3 gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              {form.status === 'published' ? 'Published ✓' : 'Publish'}
            </button>
          </>
        )}
      </div>

      {/* Tab row */}
      <div className="flex items-center px-4 gap-0.5 h-9">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(`/forms/${formId}/${tab.path}`)}
            className={clsx(
              'px-3.5 py-1 text-xs font-semibold rounded-md transition-all',
              activeTab === tab.id
                ? 'text-brand-600 bg-brand-50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
