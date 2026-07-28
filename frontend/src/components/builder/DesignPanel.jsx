import { useState, useRef, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import ThemeGalleryModal from './ThemeGalleryModal';
import ImagePickerPanel from './ImagePickerPanel';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { loadGoogleFont } from '@/lib/fonts';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

// ── WCAG AA contrast threshold ────────────────────────────────────────────────
const AA_LARGE = 3.0; // large text / UI components
const AA_NORMAL = 4.5; // normal text

// ── WCAG contrast utilities ───────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : null;
}
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return rgb.map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(a, b) {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
// ── Colour swatch ─────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#111111','#1e293b','#0f172a','#134e4a','#14532d','#7c1d1d','#1e1b4b',
  '#ffffff','#f8fafc','#fefce8','#fff1f2','#f0fdf4','#eff6ff','#fce7f3',
  '#6366f1','#3b82f6','#0ea5e9','#10b981','#22c55e','#f59e0b','#ef4444',
  '#7c3aed','#ec4899','#f97316','#14b8a6','#a855f7','#06b6d4','#84cc16',
];

function ColorSwatch({ label, value, onChange }) {
  const [localHex, setLocalHex] = useState(value ?? '#000000');
  const [open, setOpen]         = useState(false);
  const ref = useRef(null);

  useEffect(() => { setLocalHex(value ?? '#000000'); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleHexInput(v) {
    setLocalHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg border-2 border-[#111] hover:bg-gray-50 transition-colors"
          style={{ boxShadow: '1.5px 1.5px 0 #111' }}
        >
          <span className="text-xs font-mono text-gray-600 w-16">{localHex.toUpperCase()}</span>
          <span className="w-5 h-5 rounded border border-gray-300 shrink-0" style={{ backgroundColor: localHex }} />
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border-2 border-[#111] p-3 w-56"
            style={{ boxShadow: '4px 4px 0 #111' }}
          >
            <div className="flex gap-2 mb-3">
              <input
                type="color" value={localHex}
                onChange={e => { setLocalHex(e.target.value); onChange(e.target.value); }}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[#111] p-0.5"
              />
              <input
                type="text" value={localHex}
                onChange={e => handleHexInput(e.target.value)}
                className="flex-1 text-xs font-mono border-2 border-[#111] rounded-lg px-2 outline-none focus:border-[#f97316]"
                placeholder="#000000" maxLength={7}
              />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setLocalHex(c); onChange(c); }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }} title={c}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-4 pb-1 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider" style={SG}>{label}</p>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
const FONT_GROUPS = [
  {
    label: 'Sans-serif',
    fonts: [
      { label: 'Inter',               value: 'Inter, system-ui, sans-serif'               },
      { label: 'Space Grotesk',       value: 'Space Grotesk, system-ui, sans-serif'       },
      { label: 'DM Sans',             value: 'DM Sans, system-ui, sans-serif'             },
      { label: 'Outfit',              value: 'Outfit, system-ui, sans-serif'              },
      { label: 'Nunito',              value: 'Nunito, system-ui, sans-serif'              },
      { label: 'Poppins',             value: 'Poppins, system-ui, sans-serif'             },
      { label: 'Montserrat',          value: 'Montserrat, system-ui, sans-serif'          },
      { label: 'Raleway',             value: 'Raleway, system-ui, sans-serif'             },
      { label: 'Open Sans',           value: 'Open Sans, system-ui, sans-serif'           },
      { label: 'Work Sans',           value: 'Work Sans, system-ui, sans-serif'           },
      { label: 'Manrope',             value: 'Manrope, system-ui, sans-serif'             },
      { label: 'Plus Jakarta Sans',   value: 'Plus Jakarta Sans, system-ui, sans-serif'   },
      { label: 'Figtree',             value: 'Figtree, system-ui, sans-serif'             },
      { label: 'Syne',                value: 'Syne, system-ui, sans-serif'                },
      { label: 'Roboto',              value: 'Roboto, system-ui, sans-serif'              },
      { label: 'Lato',                value: 'Lato, system-ui, sans-serif'               },
      { label: 'Oswald',              value: 'Oswald, system-ui, sans-serif'              },
      { label: 'Josefin Sans',        value: 'Josefin Sans, system-ui, sans-serif'        },
    ],
  },
  {
    label: 'Serif',
    fonts: [
      { label: 'Playfair Display',    value: 'Playfair Display, Georgia, serif'           },
      { label: 'Merriweather',        value: 'Merriweather, Georgia, serif'               },
      { label: 'Lora',                value: 'Lora, Georgia, serif'                       },
      { label: 'EB Garamond',         value: 'EB Garamond, Georgia, serif'               },
      { label: 'Cormorant Garamond',  value: 'Cormorant Garamond, Georgia, serif'        },
      { label: 'DM Serif Display',    value: 'DM Serif Display, Georgia, serif'          },
      { label: 'Libre Baskerville',   value: 'Libre Baskerville, Georgia, serif'         },
      { label: 'Fraunces',            value: 'Fraunces, Georgia, serif'                  },
      { label: 'Georgia',             value: 'Georgia, serif'                            },
    ],
  },
  {
    label: 'Monospace',
    fonts: [
      { label: 'JetBrains Mono',      value: 'JetBrains Mono, monospace'                 },
      { label: 'Fira Code',           value: 'Fira Code, monospace'                      },
      { label: 'IBM Plex Mono',       value: 'IBM Plex Mono, monospace'                  },
    ],
  },
  {
    label: 'System',
    fonts: [
      { label: 'System UI',           value: 'system-ui, sans-serif'                     },
    ],
  },
];

export default function DesignPanel({ onClose }) {
  const {
    form, questions, selectedQuestionId,
    updateTheme, updateQuestionConfig,
    toggleDesignPanel, save,
  } = useBuilderStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [showGallery, setShowGallery] = useState(false);
  const [saving, setSaving]           = useState(false);

  const { data: formsData } = useQuery({
    queryKey: ['forms', activeWorkspaceId],
    queryFn: () => api.forms.list(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage', activeWorkspaceId],
    queryFn: () => api.workspaces.usage(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
    staleTime: 60_000,
  });
  const plan = usageData?.plan ?? 'free';

  if (!form) return null;

  const theme = form.theme ?? {};
  const selectedQuestion = questions.find(q => q.id === selectedQuestionId) ?? null;

  const handleBlockImageConfig = (updates) => {
    if (!selectedQuestion) return;
    updateQuestionConfig(selectedQuestion.id, updates);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save();
      toast.success('Design saved');
      toggleDesignPanel();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showGallery && (
        <ThemeGalleryModal
          onClose={() => setShowGallery(false)}
          myForms={formsData?.forms ?? []}
        />
      )}

      <aside className="w-72 bg-white border-l-2 border-[#111] overflow-y-auto shrink-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#111] sticky top-0 bg-white z-10">
          <span className="text-sm font-bold text-[#111]" style={SG}>Design</span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Gallery */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setShowGallery(true)}
            className="w-full py-2.5 text-sm font-bold border-2 border-[#111] rounded-xl bg-white text-[#111] hover:bg-[#FFFBF2] transition-all hover:-translate-y-px"
            style={{ boxShadow: '3px 3px 0 #111', ...SG }}
          >
            Open Theme Gallery
          </button>
        </div>

        <SectionHeader label="Block Style" />
        <div className="px-4 pb-1">
          <ColorSwatch
            label="Block Color"
            value={theme.backgroundColor ?? '#FFFFFF'}
            onChange={v => updateTheme({ backgroundColor: v })}
          />
          <ColorSwatch
            label="Questions"
            value={theme.questionColor ?? '#111111'}
            onChange={v => updateTheme({ questionColor: v })}
          />
          <ColorSwatch
            label="Answers"
            value={theme.answerColor ?? '#374151'}
            onChange={v => updateTheme({ answerColor: v })}
          />
          <ColorSwatch
            label="Buttons"
            value={theme.buttonColor ?? theme.primaryColor ?? '#6366f1'}
            onChange={v => updateTheme({ buttonColor: v, primaryColor: v })}
          />
          <ColorSwatch
            label="Button Text"
            value={theme.buttonTextColor ?? '#FFFFFF'}
            onChange={v => updateTheme({ buttonTextColor: v })}
          />
          <ColorSwatch
            label="Star Rating"
            value={theme.starColor ?? '#f97316'}
            onChange={v => updateTheme({ starColor: v })}
          />
        </div>

        {/* Contrast warnings — WCAG AA */}
        {(() => {
          const bg  = theme.backgroundColor  ?? '#FFFFFF';
          const qc  = theme.questionColor    ?? '#111111';
          const ac  = theme.answerColor      ?? '#374151';
          const btn = theme.buttonColor      ?? '#6366f1';
          const btx = theme.buttonTextColor  ?? '#FFFFFF';
          const warnings = [];
          const qRatio = contrastRatio(bg, qc);
          if (qRatio < AA_NORMAL) warnings.push(`Block color ↔ question text: ${qRatio.toFixed(1)}:1`);
          const aRatio = contrastRatio(bg, ac);
          if (aRatio < AA_NORMAL) warnings.push(`Block color ↔ answer text: ${aRatio.toFixed(1)}:1`);
          const bRatio = contrastRatio(btn, btx);
          if (bRatio < AA_LARGE) warnings.push(`Button ↔ button text: ${bRatio.toFixed(1)}:1`);
          if (!warnings.length) return null;
          return (
            <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg space-y-0.5">
              <p className="text-xs font-semibold text-amber-700">⚠ Low contrast detected</p>
              {warnings.map(w => (
                <p key={w} className="text-[10px] text-amber-600 leading-snug">• {w}</p>
              ))}
            </div>
          );
        })()}

        {/* ── SECTION 3: Block Image ── */}
        <SectionHeader label="Block Image" />
        <p className="px-4 text-[10px] text-gray-400 leading-relaxed mb-1">
          Add a photo inside the selected block — it appears in a split layout alongside the question.
        </p>
        <ImagePickerPanel
          selectedQuestion={selectedQuestion}
          onUpdateConfig={handleBlockImageConfig}
          workspaceId={activeWorkspaceId}
          plan={plan}
        />

        {/* ── Font ── */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" style={SG}>Font</p>
          <select
            value={theme.fontFamily ?? 'Playfair Display, Georgia, serif'}
            onChange={e => { loadGoogleFont(e.target.value); updateTheme({ fontFamily: e.target.value }); }}
            className="w-full border-2 border-[#111] rounded-xl px-3 py-2 text-sm font-medium text-[#111] bg-white outline-none focus:border-[#f97316]"
            style={SG}
          >
            {FONT_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.fonts.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* ── Alignment ── */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" style={SG}>Alignment</p>
          <div className="flex gap-2">
            {[
              { value: 'left',   Icon: AlignLeft   },
              { value: 'center', Icon: AlignCenter  },
              { value: 'right',  Icon: AlignRight   },
            ].map(({ value, Icon }) => (
              <button
                key={value}
                onClick={() => updateTheme({ alignment: value })}
                className={clsx(
                  'flex-1 py-2 rounded-xl border-2 border-[#111] flex items-center justify-center transition-all',
                  (theme.alignment ?? 'left') === value ? 'bg-[#111] text-white' : 'bg-white text-[#111] hover:bg-gray-50'
                )}
                style={{ boxShadow: '2px 2px 0 #111' }}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* ── Save / Cancel ── */}
        <div className="px-4 py-3 border-t-2 border-[#111] flex gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border-2 border-[#111] text-sm font-bold text-[#111] bg-white hover:bg-gray-50 transition-all"
            style={{ boxShadow: '2px 2px 0 #111', ...SG }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl border-2 border-[#111] text-sm font-bold text-white bg-[#111] hover:bg-gray-800 transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0 #f97316', ...SG }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </aside>
    </>
  );
}
