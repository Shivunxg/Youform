import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  X, ArrowLeft, ArrowRight, Sparkles, Plus, LayoutGrid,
  Upload, Loader2, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

// ── Main export ─────────────────────────────────────────────
export default function CreateFormModal({ onClose, onOpenTemplates }) {
  const [step, setStep] = useState('main'); // main | ai | typeform | google
  return (
    <>
      <div className="fixed inset-0 bg-[#111]/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#FFFBF2] rounded-2xl border-2 border-[#111] w-full max-w-lg overflow-hidden"
          style={{ boxShadow: '8px 8px 0 #111' }}
        >
          {step === 'main'     && <MainStep     onClose={onClose} onStep={setStep} onOpenTemplates={onOpenTemplates} />}
          {step === 'ai'       && <AiStep       onBack={() => setStep('main')} onClose={onClose} />}
          {step === 'typeform' && <ImportStep   onBack={() => setStep('main')} onClose={onClose} kind="typeform" />}
          {step === 'google'   && <ImportStep   onBack={() => setStep('main')} onClose={onClose} kind="google" />}
        </div>
      </div>
    </>
  );
}

// ── Header shared by sub-steps ───────────────────────────────
function SubHeader({ onBack, onClose, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-[#111] bg-white">
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-[#FFFBF2] transition-colors shrink-0"
        style={{ boxShadow: '2px 2px 0 #111' }}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-[#111] leading-tight" style={SG}>{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-[#FFFBF2] transition-colors shrink-0"
        style={{ boxShadow: '2px 2px 0 #111' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── STEP 1: Main picker ──────────────────────────────────────
function MainStep({ onClose, onStep, onOpenTemplates }) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [creating, setCreating] = useState(false);

  const blankMutation = useMutation({
    mutationFn: () => api.forms.create(activeWorkspaceId, { title: 'Untitled form' }),
    onSuccess: ({ form }) => {
      toast.success('Form created');
      onClose();
      navigate(`/forms/${form.id}/builder`);
    },
    onError: (err) => {
      toast.error(err.message || 'Could not create form');
      setCreating(false);
    },
  });

  function handleBlank() {
    if (!activeWorkspaceId) return;
    setCreating(true);
    blankMutation.mutate();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b-2 border-[#111] bg-white">
        <div>
          <h2 className="text-lg font-bold text-[#111]" style={SG}>Create a new form</h2>
          <p className="text-xs text-gray-500 mt-0.5">Choose how you'd like to get started.</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center hover:bg-[#FFFBF2] transition-colors"
          style={{ boxShadow: '2px 2px 0 #111' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-3">
        {/* AI — featured full-width row */}
        <button
          onClick={() => onStep('ai')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-[#111] bg-[#111] text-white hover:-translate-y-0.5 transition-all group"
          style={{ boxShadow: '4px 4px 0 #f97316' }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#f97316] border-2 border-[#f97316] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={SG}>Create with AI</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f97316] text-white border border-orange-400">
                New
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">Describe your form and AI builds it instantly</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Start blank */}
          <OptionCard
            icon={<Plus className="w-5 h-5" />}
            iconBg="#FFFBF2"
            title="Start blank"
            subtitle="Create from scratch"
            loading={creating}
            onClick={handleBlank}
          />

          {/* Pick a template */}
          <OptionCard
            icon={<LayoutGrid className="w-5 h-5" />}
            iconBg="#DBEAFE"
            title="Pick a template"
            subtitle={`${18} ready-to-use templates`}
            onClick={() => { onClose(); onOpenTemplates(); }}
          />

          {/* Typeform import */}
          <OptionCard
            icon={<TypeformIcon />}
            iconBg="#EDE9FE"
            title="Import Typeform"
            subtitle="Migrate your forms"
            onClick={() => onStep('typeform')}
          />

          {/* Google Forms import */}
          <OptionCard
            icon={<GoogleFormsIcon />}
            iconBg="#DCFCE7"
            title="Import Google Forms"
            subtitle="Migrate your forms"
            onClick={() => onStep('google')}
          />
        </div>
      </div>
    </div>
  );
}

function OptionCard({ icon, iconBg, title, subtitle, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-start gap-3 p-4 rounded-xl border-2 border-[#111] bg-white hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-left"
      style={{ boxShadow: '3px 3px 0 #111' }}
    >
      <div
        className="w-9 h-9 rounded-lg border-2 border-[#111] flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin text-[#111]" />
          : icon}
      </div>
      <div>
        <p className="text-sm font-bold text-[#111] leading-tight" style={SG}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </button>
  );
}

// ── STEP 2a: AI generation ───────────────────────────────────
function AiStep({ onBack, onClose }) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef(null);

  const mutation = useMutation({
    mutationFn: () => api.ai.generateForm({ prompt: prompt.trim(), workspaceId: activeWorkspaceId }),
    onSuccess: ({ formId }) => {
      toast.success('Form built!');
      onClose();
      navigate(`/forms/${formId}/builder`);
    },
    onError: (err) => toast.error(err.message || 'Generation failed — please try again'),
  });

  const canSubmit = prompt.trim().length >= 5 && !mutation.isPending;

  const EXAMPLES = [
    'A customer feedback form with a 5-star rating and comment box',
    'A job application form with resume upload and availability',
    'A weekly team check-in with mood rating and blockers field',
    'A product waitlist with email, name, and use-case question',
  ];

  return (
    <div>
      <SubHeader
        onBack={onBack}
        onClose={onClose}
        title="Create with AI"
        subtitle="Describe your form in plain English"
      />

      <div className="p-5">
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#111] uppercase tracking-wide mb-2" style={SG}>
            What kind of form do you need?
          </label>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) mutation.mutate(); }}
            placeholder="e.g. A customer satisfaction survey with a rating, open comment, and NPS score…"
            rows={4}
            disabled={mutation.isPending}
            className="w-full px-4 py-3 border-2 border-[#111] rounded-xl text-sm outline-none focus:border-[#f97316] bg-white transition-colors resize-none disabled:opacity-60"
            style={SG}
          />
          <p className="text-[11px] text-gray-400 mt-1">
            {prompt.length}/500 · Cmd+Enter to generate
          </p>
        </div>

        {/* Example prompts */}
        {!prompt && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2" style={SG}>Try an example</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                  className="text-left text-xs text-[#111] px-3 py-2 rounded-lg border-2 border-[#111] bg-white hover:bg-[#FFFBF2] transition-colors"
                  style={{ boxShadow: '2px 2px 0 #111' }}
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#f97316] bg-orange-50 mb-4">
            <Loader2 className="w-4 h-4 animate-spin text-[#f97316] shrink-0" />
            <p className="text-sm font-bold text-[#f97316]" style={SG}>Building your form…</p>
          </div>
        )}

        {mutation.isError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border-2 border-red-300 bg-red-50 mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 font-medium">{mutation.error?.message}</p>
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className={clsx(
            'w-full py-3.5 rounded-xl border-2 border-[#111] text-sm font-bold flex items-center justify-center gap-2 transition-all',
            canSubmit ? 'bg-[#f97316] text-white hover:-translate-y-0.5' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          style={{ boxShadow: canSubmit ? '4px 4px 0 #111' : 'none', ...SG }}
        >
          <Sparkles className="w-4 h-4" />
          Generate form
        </button>
      </div>
    </div>
  );
}

// ── STEP 2b: Import (Typeform or Google) ─────────────────────
const IMPORT_CONFIG = {
  typeform: {
    title: 'Import from Typeform',
    subtitle: 'Paste your Typeform URL and personal token',
    urlLabel: 'Typeform URL',
    urlPlaceholder: 'https://yourname.typeform.com/to/XXXXXXXX',
    urlPattern: /typeform\.com\/to\/[A-Za-z0-9]+/,
    urlError: 'Please enter a valid Typeform URL (yourname.typeform.com/to/…)',
    hasToken: true,
    tokenLabel: 'Typeform Personal Token',
    tokenPlaceholder: 'tfp_••••••••••••••••••••',
    tokenHint: 'Typeform → Avatar → Personal tokens',
    buttonLabel: 'Convert to Youform',
  },
  google: {
    title: 'Import Google Forms',
    subtitle: 'Paste your public Google Form URL',
    urlLabel: 'Google Form URL',
    urlPlaceholder: 'https://docs.google.com/forms/d/e/…/viewform',
    urlPattern: /docs\.google\.com\/forms/,
    urlError: 'Please enter a valid Google Forms URL',
    hasToken: false,
    buttonLabel: 'Convert to Youform',
  },
};

function ImportStep({ onBack, onClose, kind }) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const cfg = IMPORT_CONFIG[kind];

  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [urlError, setUrlError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (kind === 'typeform') {
        return api.typeform.import({ url: url.trim(), token: token.trim(), workspaceId: activeWorkspaceId });
      }
      return api.googleForms.import({ url: url.trim(), workspaceId: activeWorkspaceId });
    },
    onSuccess: ({ formId, title, questionCount, skipped }) => {
      const msg = skipped
        ? `"${title}" imported (${skipped} unsupported field${skipped > 1 ? 's' : ''} skipped)`
        : `"${title}" imported with ${questionCount} questions`;
      toast.success(msg, { duration: 4000 });
      onClose();
      navigate(`/forms/${formId}/builder`);
    },
    onError: (err) => {}, // error shown inline
  });

  function validate() {
    if (!cfg.urlPattern.test(url.trim())) {
      setUrlError(cfg.urlError);
      return false;
    }
    if (cfg.hasToken && !token.trim()) {
      setUrlError('Personal token is required for Typeform import.');
      return false;
    }
    setUrlError('');
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    mutation.mutate();
  }

  const IconEl = kind === 'typeform' ? TypeformIcon : GoogleFormsIcon;
  const iconBg  = kind === 'typeform' ? '#EDE9FE' : '#DCFCE7';

  return (
    <div>
      <SubHeader onBack={onBack} onClose={onClose} title={cfg.title} subtitle={cfg.subtitle} />

      <div className="p-5">
        {/* Source badge */}
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl border-2 border-[#111] bg-white" style={{ boxShadow: '3px 3px 0 #111' }}>
          <div className="w-8 h-8 rounded-lg border-2 border-[#111] flex items-center justify-center shrink-0" style={{ background: iconBg }}>
            <IconEl />
          </div>
          <div>
            <p className="text-xs font-bold text-[#111]" style={SG}>{cfg.title}</p>
            <p className="text-[11px] text-gray-500">Imports form structure · not responses</p>
          </div>
        </div>

        {/* URL field */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#111] uppercase tracking-wide mb-1.5" style={SG}>
            {cfg.urlLabel}
          </label>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setUrlError(''); mutation.reset(); }}
            placeholder={cfg.urlPlaceholder}
            disabled={mutation.isPending}
            className={clsx(
              'w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition-colors bg-[#FFFBF2] disabled:opacity-60',
              urlError ? 'border-red-400 focus:border-red-500' : 'border-[#111] focus:border-[#f97316]'
            )}
            style={SG}
          />
          {urlError && <p className="text-xs text-red-500 mt-1 font-medium">{urlError}</p>}
        </div>

        {/* Token field (Typeform only) */}
        {cfg.hasToken && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-[#111] uppercase tracking-wide mb-1.5" style={SG}>
              {cfg.tokenLabel}
            </label>
            <input
              type="password"
              value={token}
              onChange={e => { setToken(e.target.value); mutation.reset(); }}
              placeholder={cfg.tokenPlaceholder}
              disabled={mutation.isPending}
              className="w-full px-4 py-3 border-2 border-[#111] rounded-xl text-sm outline-none focus:border-[#f97316] transition-colors bg-[#FFFBF2] disabled:opacity-60"
              style={SG}
            />
            <p className="text-[11px] text-gray-400 mt-1">{cfg.tokenHint}. Token is never stored.</p>
          </div>
        )}

        {/* Google Forms note about sharing */}
        {kind === 'google' && (
          <div className="mb-5 px-3 py-2.5 rounded-lg border-2 border-[#111] bg-yellow-50 text-xs text-gray-600" style={SG}>
            The form must be set to <strong>"Anyone with the link"</strong> in Google Forms sharing settings.
          </div>
        )}

        {/* API error */}
        {mutation.isError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border-2 border-red-300 bg-red-50 mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 font-medium">{mutation.error?.message}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!url.trim() || mutation.isPending}
          className={clsx(
            'w-full py-3.5 rounded-xl border-2 border-[#111] text-sm font-bold flex items-center justify-center gap-2 transition-all',
            url.trim() && !mutation.isPending
              ? 'bg-[#111] text-white hover:-translate-y-0.5'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          style={{ boxShadow: url.trim() && !mutation.isPending ? '4px 4px 0 #f97316' : 'none', ...SG }}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</>
          ) : (
            <><Upload className="w-4 h-4" /> {cfg.buttonLabel}</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Brand icons ───────────────────────────────────────────────
function TypeformIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
      <rect x="2" y="3" width="16" height="3" rx="1.5" fill="#6d28d9"/>
      <rect x="2" y="3" width="3" height="8" rx="1.5" fill="#6d28d9"/>
      <rect x="2" y="8" width="10" height="3" rx="1.5" fill="#6d28d9"/>
      <rect x="2" y="13" width="16" height="3" rx="1.5" fill="#6d28d9" opacity=".4"/>
    </svg>
  );
}

function GoogleFormsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
      <rect x="4" y="2" width="12" height="16" rx="2" fill="#15803d" opacity=".15"/>
      <rect x="4" y="2" width="12" height="16" rx="2" stroke="#15803d" strokeWidth="1.5"/>
      <circle cx="7" cy="7" r="1" fill="#15803d"/>
      <rect x="9.5" y="6.5" width="5" height="1" rx=".5" fill="#15803d"/>
      <circle cx="7" cy="10" r="1" fill="#15803d"/>
      <rect x="9.5" y="9.5" width="5" height="1" rx=".5" fill="#15803d"/>
      <circle cx="7" cy="13" r="1" fill="#15803d"/>
      <rect x="9.5" y="12.5" width="5" height="1" rx=".5" fill="#15803d"/>
    </svg>
  );
}
