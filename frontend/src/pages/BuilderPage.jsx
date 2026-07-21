import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useBuilderStore } from '@/stores/builderStore';
import BuilderHeader      from '@/components/builder/BuilderHeader';
import QuestionList       from '@/components/builder/QuestionList';
import QuestionPanel      from '@/components/builder/QuestionPanel';
import AddQuestionPanel   from '@/components/builder/AddQuestionPanel';
import FormPreview        from '@/components/builder/FormPreview';
import FormSettingsPanel  from '@/components/builder/FormSettingsPanel';
import toast from 'react-hot-toast';

export default function BuilderPage() {
  const { formId } = useParams();
  const { form, questions, isDirty, isSaving, previewMode, showFormSettings, toggleFormSettings, loadForm, save, reorderQuestions } = useBuilderStore();

  // Load form on mount
  useEffect(() => {
    loadForm(formId).catch(() => toast.error('Could not load form'));
  }, [formId]);

  // Auto-save every 30s when dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      save().catch(() => {});
    }, 30_000);
    return () => clearTimeout(timer);
  }, [isDirty, questions, form]);

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save().then(() => toast.success('Saved')).catch(() => toast.error('Save failed'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(({ active, over }) => {
    if (over && active.id !== over.id) {
      reorderQuestions(active.id, over.id);
    }
  }, [reorderQuestions]);

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <BuilderHeader />

      {previewMode ? (
        <FormPreview />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: question type picker */}
          <AddQuestionPanel />

          {/* Center: question list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <QuestionList />
              </SortableContext>
            </DndContext>
          </div>

          {/* Right: form settings or question settings panel */}
          {showFormSettings
            ? <FormSettingsPanel onClose={toggleFormSettings} />
            : <QuestionPanel />
          }
        </div>
      )}
    </div>
  );
}
