import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { api } from '@/lib/api';

const DEFAULT_QUESTION = (type) => ({
  id: nanoid(),
  type,
  title: '',
  description: '',
  required: false,
  config: defaultConfig(type),
  validation: {},
  logic: [],
  position: 0,
  _isNew: true,
});

function defaultConfig(type) {
  switch (type) {
    case 'multiple_choice': return { choices: [{ id: nanoid(), label: 'Option 1' }, { id: nanoid(), label: 'Option 2' }], allowMultiple: false, allowOther: false };
    case 'rating':          return { steps: 5, shape: 'star' };
    case 'nps':             return { lowLabel: 'Not likely', highLabel: 'Extremely likely' };
    case 'file_upload':     return { allowedTypes: ['pdf', 'png', 'jpg', 'jpeg'], maxSizeMb: 10, maxFiles: 1 };
    case 'dropdown':        return { choices: [{ id: nanoid(), label: 'Option 1' }] };
    case 'matrix':          return { rows: ['Row 1', 'Row 2'], columns: ['Col 1', 'Col 2', 'Col 3'] };
    case 'ranking':         return { items: [{ id: nanoid(), label: 'Item 1' }, { id: nanoid(), label: 'Item 2' }] };
    case 'short_text':      return { placeholder: '' };
    case 'long_text':       return { placeholder: '', minRows: 3 };
    case 'number':          return { placeholder: '', min: null, max: null };
    case 'payment':         return { currency: 'USD', amount: null };
    case 'welcome_screen':  return { buttonLabel: 'Start', description: '' };
    case 'thank_you_screen':return { message: 'Thank you for your response!' };
    default:                return {};
  }
}

export const useBuilderStore = create((set, get) => ({
  // Form metadata
  form: null,
  questions: [],
  selectedQuestionId: null,
  isDirty: false,
  isSaving: false,
  previewMode: false,     // false = editor, true = preview
  previewDevice: 'desktop', // 'desktop' | 'mobile'
  showFormSettings: false,

  // ── Load ───────────────────────────────────────────────────
  loadForm: async (formId) => {
    const { form } = await api.forms.get(formId);
    set({
      form,
      questions: (form.questions ?? []).sort((a, b) => a.position - b.position),
      selectedQuestionId: null,
      isDirty: false,
    });
  },

  // ── Question selection ─────────────────────────────────────
  selectQuestion: (id) => set({ selectedQuestionId: id, showFormSettings: false }),
  deselect: () => set({ selectedQuestionId: null }),
  toggleFormSettings: () => set(s => ({ showFormSettings: !s.showFormSettings, selectedQuestionId: null })),

  // ── Add question ───────────────────────────────────────────
  addQuestion: (type, afterId) => {
    const { questions } = get();
    const afterIndex = afterId ? questions.findIndex(q => q.id === afterId) : questions.length - 1;
    const insertAt = afterIndex + 1;
    const newQ = { ...DEFAULT_QUESTION(type), position: insertAt };

    const reordered = [
      ...questions.slice(0, insertAt),
      newQ,
      ...questions.slice(insertAt),
    ].map((q, i) => ({ ...q, position: i }));

    set({ questions: reordered, selectedQuestionId: newQ.id, isDirty: true });
    return newQ;
  },

  // ── Update question ────────────────────────────────────────
  updateQuestion: (id, updates) => {
    set(s => ({
      questions: s.questions.map(q => q.id === id ? { ...q, ...updates } : q),
      isDirty: true,
    }));
  },

  updateQuestionConfig: (id, configUpdates) => {
    set(s => ({
      questions: s.questions.map(q =>
        q.id === id ? { ...q, config: { ...q.config, ...configUpdates } } : q
      ),
      isDirty: true,
    }));
  },

  // ── Delete question ────────────────────────────────────────
  deleteQuestion: (id) => {
    set(s => {
      const filtered = s.questions.filter(q => q.id !== id).map((q, i) => ({ ...q, position: i }));
      const newSelected = filtered.length > 0 ? filtered[Math.max(0, filtered.findIndex(q => q.id === s.selectedQuestionId) - 1)]?.id : null;
      return { questions: filtered, selectedQuestionId: newSelected, isDirty: true };
    });
  },

  // ── Duplicate question ─────────────────────────────────────
  duplicateQuestion: (id) => {
    const { questions } = get();
    const idx = questions.findIndex(q => q.id === id);
    if (idx === -1) return;
    const copy = { ...questions[idx], id: nanoid(), title: questions[idx].title + ' (copy)', _isNew: true };
    const reordered = [
      ...questions.slice(0, idx + 1),
      copy,
      ...questions.slice(idx + 1),
    ].map((q, i) => ({ ...q, position: i }));
    set({ questions: reordered, selectedQuestionId: copy.id, isDirty: true });
  },

  // ── Reorder (after DnD) ────────────────────────────────────
  reorderQuestions: (activeId, overId) => {
    const { questions } = get();
    const oldIndex = questions.findIndex(q => q.id === activeId);
    const newIndex = questions.findIndex(q => q.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    set({ questions: reordered.map((q, i) => ({ ...q, position: i })), isDirty: true });
  },

  // ── Form metadata updates ──────────────────────────────────
  updateForm: (updates) => {
    set(s => ({ form: { ...s.form, ...updates }, isDirty: true }));
  },

  updateTheme: (themeUpdates) => {
    set(s => ({ form: { ...s.form, theme: { ...s.form.theme, ...themeUpdates } }, isDirty: true }));
  },

  // ── Save ───────────────────────────────────────────────────
  save: async () => {
    const { form, questions, isSaving } = get();
    if (!form || isSaving) return;

    set({ isSaving: true });
    try {
      // Save form metadata
      await api.forms.update(form.id, {
        title: form.title,
        description: form.description,
        layout: form.layout,
        theme: form.theme,
        settings: form.settings,
        opens_at: form.opens_at ?? null,
        closes_at: form.closes_at ?? null,
        response_limit: form.response_limit ?? null,
      });

      // Save questions (full replace)
      await api.forms.saveQuestions(form.id, questions.map(({ _isNew, ...q }) => q));

      set({ isDirty: false, isSaving: false });
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  // ── Publish / Unpublish ────────────────────────────────────
  publish: async () => {
    const { form, save } = get();
    await save();
    await api.forms.update(form.id, { status: 'published' });
    set(s => ({ form: { ...s.form, status: 'published' } }));
  },

  unpublish: async () => {
    const { form } = get();
    await api.forms.update(form.id, { status: 'draft' });
    set(s => ({ form: { ...s.form, status: 'draft' } }));
  },

  // ── Preview ────────────────────────────────────────────────
  setPreviewMode: (val) => set({ previewMode: val }),
  setPreviewDevice: (val) => set({ previewDevice: val }),

  // ── Getters ────────────────────────────────────────────────
  getQuestion: (id) => get().questions.find(q => q.id === id),
  getSelectedQuestion: () => {
    const { questions, selectedQuestionId } = get();
    return questions.find(q => q.id === selectedQuestionId) ?? null;
  },
}));
