import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Eye, EyeOff, Settings } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import toast from 'react-hot-toast';

export default function BuilderHeader() {
  const navigate = useNavigate();
  const { form, isDirty, isSaving, previewMode, showFormSettings, setPreviewMode, toggleFormSettings, save, publish, updateForm } = useBuilderStore();

  const handleSave = async () => {
    try { await save(); toast.success('Saved'); } catch { toast.error('Save failed'); }
  };

  const handlePublish = async () => {
    try { await publish(); toast.success('Published!'); } catch (err) { toast.error(err.message); }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
      <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex-1">
        <input
          className="text-sm font-medium text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand-400"
          value={form?.title ?? ''}
          onChange={e => updateForm({ title: e.target.value })}
        />
        <span className="ml-2 text-xs text-amber-500">{isDirty ? '● Unsaved' : ''}</span>
      </div>

      <button
        onClick={toggleFormSettings}
        className={`btn-ghost p-2 ${showFormSettings ? 'text-brand-600 bg-brand-50' : 'text-gray-500'}`}
        title="Form Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      <button
        onClick={() => setPreviewMode(!previewMode)}
        className="btn-secondary"
      >
        {previewMode ? <><EyeOff className="w-4 h-4" />Edit</> : <><Eye className="w-4 h-4" />Preview</>}
      </button>

      <button
        onClick={handleSave}
        disabled={!isDirty || isSaving}
        className="btn-secondary"
      >
        <Save className="w-4 h-4" />Save
      </button>

      <button onClick={handlePublish} className="btn-primary">
        <Globe className="w-4 h-4" />{form?.status === 'published' ? 'Published' : 'Publish'}
      </button>
    </header>
  );
}
