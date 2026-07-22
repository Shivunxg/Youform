import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const FAQS = [
  {
    q: 'What is the Typeform importer?',
    a: 'It copies your Typeform form — questions, choices, and settings — into a FormFlow form in one click. Your original Typeform is not modified.',
  },
  {
    q: 'Where do I find my Typeform Personal Token?',
    a: 'Log into Typeform → click your avatar → Personal tokens → Generate a new token. Copy it and paste it here. The token is only used for this import and is never stored.',
  },
  {
    q: 'Which question types are supported?',
    a: 'Short text, long text, multiple choice, dropdown, rating, opinion scale (NPS), yes/no, email, phone, number, date, and file upload. Statements become short-text fields.',
  },
  {
    q: 'Will my existing responses be imported?',
    a: 'Not yet — this imports the form structure only. Response migration is coming soon.',
  },
  {
    q: 'Is my Typeform token stored?',
    a: 'No. The token is sent directly to the import API, used once to fetch your form from Typeform, and never persisted.',
  },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-2 border-[#111] rounded-xl overflow-hidden" style={{ boxShadow: open ? '4px 4px 0 #f97316' : '4px 4px 0 #111' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-[#FFFBF2] transition-colors"
      >
        <span className="text-sm font-bold text-[#111]" style={SG}>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[#111] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#111] shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 border-t-2 border-[#111] bg-[#FFFBF2] text-sm text-gray-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function TypeformImportPage() {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);

  const importMutation = useMutation({
    mutationFn: () => api.typeform.import({ url, token, workspaceId: activeWorkspaceId }),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Form imported!');
    },
    onError: (err) => toast.error(err.message || 'Import failed'),
  });

  const canSubmit = url.trim() && token.trim() && !importMutation.isPending;

  if (result) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-5 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl border-2 border-[#111] flex items-center justify-center mx-auto mb-6"
            style={{ background: '#111', boxShadow: '4px 4px 0 #f97316' }}>
            <CheckCircle2 className="w-8 h-8 text-[#f97316]" />
          </div>
          <h1 className="text-2xl font-bold text-[#111] mb-2" style={SG}>Import complete!</h1>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-bold text-[#111]">{result.title}</span> was imported with {result.questionCount} questions.
          </p>
          <p className="text-gray-400 text-xs mb-8">Review and customise it in the builder before sharing.</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(`/forms/${result.formId}/builder`)}
              className="px-6 py-3 text-sm font-bold text-white border-2 border-[#111] rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-px"
              style={{ background: '#f97316', boxShadow: '4px 4px 0 #111', ...SG }}
            >
              Open in builder <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setResult(null); setUrl(''); setToken(''); }}
              className="px-6 py-3 text-sm font-bold text-[#111] border-2 border-[#111] rounded-xl transition-all hover:-translate-y-px"
              style={{ background: 'white', boxShadow: '4px 4px 0 #111', ...SG }}
            >
              Import another
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-5 py-12">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl border-2 border-[#111] flex items-center justify-center"
            style={{ background: '#111', boxShadow: '4px 4px 0 #f97316' }}>
            <svg viewBox="0 0 64 64" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="12" width="44" height="6" rx="3" fill="#f97316"/>
              <rect x="10" y="12" width="6" height="20" rx="3" fill="#f97316"/>
              <rect x="10" y="24" width="28" height="6" rx="3" fill="#f97316"/>
              <rect x="10" y="36" width="44" height="6" rx="3" fill="white"/>
              <rect x="10" y="36" width="6" height="20" rx="3" fill="white"/>
              <rect x="10" y="48" width="28" height="6" rx="3" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#111] mb-2" style={SG}>Typeform → FormFlow</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Paste your Typeform URL and your personal token. We'll copy your form structure across in one click — no rebuilding required.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border-2 border-[#111] rounded-2xl p-6 mb-6" style={{ boxShadow: '6px 6px 0 #111' }}>
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#111] mb-1.5 uppercase tracking-wide" style={SG}>
              Typeform URL
            </label>
            <input
              type="url"
              placeholder="https://yourname.typeform.com/to/XXXXXXXX"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#111] rounded-xl text-sm outline-none focus:border-[#f97316] transition-colors bg-[#FFFBF2]"
              style={SG}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-[#111] mb-1.5 uppercase tracking-wide" style={SG}>
              Typeform Personal Token
            </label>
            <input
              type="password"
              placeholder="tfp_••••••••••••••••••••"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#111] rounded-xl text-sm outline-none focus:border-[#f97316] transition-colors bg-[#FFFBF2]"
              style={SG}
            />
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <span>Typeform → Avatar → Personal tokens.</span>
              <a
                href="https://www.typeform.com/help/a/personal-access-tokens-360029559951/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f97316] font-bold hover:underline inline-flex items-center gap-0.5"
              >
                How to get it <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <button
            onClick={() => importMutation.mutate()}
            disabled={!canSubmit}
            className={clsx(
              'w-full py-3.5 text-sm font-bold border-2 border-[#111] rounded-xl transition-all flex items-center justify-center gap-2',
              canSubmit
                ? 'text-white hover:-translate-y-0.5'
                : 'opacity-50 cursor-not-allowed text-white'
            )}
            style={{ background: '#f97316', boxShadow: canSubmit ? '4px 4px 0 #111' : 'none', ...SG }}
          >
            {importMutation.isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" />
                </svg>
                Importing…
              </>
            ) : (
              <>Import form <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* What gets imported */}
        <div className="bg-white border-2 border-[#111] rounded-xl px-5 py-4 mb-8" style={{ boxShadow: '4px 4px 0 #f97316' }}>
          <p className="text-xs font-bold text-[#111] uppercase tracking-wide mb-3" style={SG}>What gets imported</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {['Questions & choices', 'Welcome screen', 'Thank you screen', 'Required fields', 'Rating scales', 'Yes / No fields'].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-4 h-4 rounded-md border-2 border-[#111] bg-[#f97316] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <h2 className="text-base font-bold text-[#111] mb-4" style={SG}>Frequently asked questions</h2>
        <div className="flex flex-col gap-3">
          {FAQS.map(f => <Faq key={f.q} {...f} />)}
        </div>
      </div>
    </AppShell>
  );
}
