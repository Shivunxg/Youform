import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBuilderStore } from '@/stores/builderStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import FormHeader        from '@/components/builder/FormHeader';
import BlockList         from '@/components/builder/BlockList';
import Canvas            from '@/components/builder/Canvas';
import QuestionPanel     from '@/components/builder/QuestionPanel';
import FormSettingsPanel from '@/components/builder/FormSettingsPanel';
import DesignPanel       from '@/components/builder/DesignPanel';
import FormPreview       from '@/components/builder/FormPreview';
import toast from 'react-hot-toast';

export default function BuilderPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { workspaces } = useWorkspaceStore();
  const {
    form, questions, isDirty, previewMode,
    showFormSettings, toggleFormSettings,
    designPanelOpen, toggleDesignPanel,
    loadForm, save, reorderQuestions,
  } = useBuilderStore();

  // Load form
  useEffect(() => {
    loadForm(formId).catch(() => toast.error('Could not load form'));
  }, [formId]);

  // Redirect viewers — they can view responses but not edit
  useEffect(() => {
    if (!form) return;
    const ws = workspaces.find(w => w.id === form.workspace_id);
    if (ws?.role === 'viewer') {
      toast.error('Viewers cannot edit forms');
      navigate(`/forms/${formId}/responses`, { replace: true });
    }
  }, [form?.workspace_id, workspaces]);

  // Auto-save every 30s when dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => save().catch(() => {}), 30_000);
    return () => clearTimeout(timer);
  }, [isDirty, questions, form]);

  // Ctrl/Cmd + S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save()
          .then(() => toast.success('Saved'))
          .catch(() => toast.error('Save failed'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(({ active, over }) => {
    if (over && active.id !== over.id) reorderQuestions(active.id, over.id);
  }, [reorderQuestions]);

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Shared form header with tabs */}
      <FormHeader isBuilder />

      {/* Builder: always rendered */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map(q => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 flex overflow-hidden">
            {/* Left: ordered block list */}
            <BlockList />

            {/* Center: live canvas */}
            <Canvas onToggleDesign={toggleFormSettings} />

            {/* Right: property panel */}
            {designPanelOpen
              ? <DesignPanel onClose={toggleDesignPanel} />
              : showFormSettings
                ? <FormSettingsPanel onClose={toggleFormSettings} />
                : <QuestionPanel />
            }
          </div>
        </SortableContext>
      </DndContext>

      {/* Preview modal overlay — rendered on top of builder */}
      {previewMode && <FormPreview />}
    </div>
  );
}
