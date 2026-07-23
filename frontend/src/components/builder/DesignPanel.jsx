import { useState, useRef, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, ImageOff } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import ThemeGalleryModal from './ThemeGalleryModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

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
const PICSUM_BLK = (seed) => `https://picsum.photos/seed/${seed}/800/600`;

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

// ── Block image library ───────────────────────────────────────────────────────
const BLOCK_IMAGE_LIBRARY = [
  { label: 'People', images: [
    { seed: 'people-work-team',       label: 'Team',      description: 'Collaborative team working together'   },
    { seed: 'woman-laptop-remote',    label: 'Remote',    description: 'Person working remotely on a laptop'  },
    { seed: 'business-handshake',     label: 'Partners',  description: 'Business partners shaking hands'      },
    { seed: 'diverse-group-smiling',  label: 'Diversity', description: 'Diverse group of smiling colleagues'  },
    { seed: 'professional-portrait',  label: 'Portrait',  description: 'Professional business headshot'       },
  ]},
  { label: 'Workspace', images: [
    { seed: 'minimal-desk-setup',   label: 'Desk',   description: 'Clean, minimal desk setup'          },
    { seed: 'open-plan-office',     label: 'Office', description: 'Modern open-plan office space'      },
    { seed: 'coffee-shop-laptop',   label: 'Café',   description: 'Working from a coffee shop'         },
    { seed: 'creative-studio-room', label: 'Studio', description: 'Creative studio workspace'          },
  ]},
  { label: 'Lifestyle', images: [
    { seed: 'morning-coffee-cup',    label: 'Morning',  description: 'Morning coffee and slow start'    },
    { seed: 'reading-book-cozy',     label: 'Reading',  description: 'Cozy reading atmosphere'          },
    { seed: 'wellness-yoga-mat',     label: 'Wellness', description: 'Wellness and yoga practice'       },
    { seed: 'city-street-lifestyle', label: 'Urban',    description: 'Urban city street lifestyle'      },
  ]},
  { label: 'Product', images: [
    { seed: 'tech-gadgets-flat',     label: 'Tech',    description: 'Tech gadgets flat lay'             },
    { seed: 'fashion-clothing-rack', label: 'Fashion', description: 'Fashion clothing rack'             },
    { seed: 'food-restaurant-dish',  label: 'Food',    description: 'Restaurant-quality food dish'      },
  ]},
];

function BlockImagePicker({ selectedQuestion, onUpdateConfig }) {
  if (!selectedQuestion) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-gray-400 italic">Select a block to add an in-block image</p>
      </div>
    );
  }

  const current  = selectedQuestion.config?.blockImage ?? null;
  const position = selectedQuestion.config?.blockImagePosition ?? 'right';

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Current image preview */}
      {current && (
        <div
          className="relative w-full h-16 rounded-xl border-2 border-[#111] overflow-hidden"
          style={{ boxShadow: '2px 2px 0 #111' }}
        >
          <img src={current} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onUpdateConfig({ blockImage: null, blockImagePosition: undefined })}
            title="Remove block image"
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
          >
            <ImageOff className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* None chip + position controls — always visible */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateConfig({ blockImage: null, blockImagePosition: undefined })}
          className={clsx(
            'text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 transition-all shrink-0',
            !current
              ? 'border-[#111] bg-[#111] text-white'
              : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
          )}
          style={!current ? { boxShadow: '1.5px 1.5px 0 #f97316' } : {}}
        >
          None
        </button>
        {current && (
          <div className="flex gap-1 ml-auto">
            {['left', 'right'].map(pos => (
              <button
                key={pos}
                onClick={() => onUpdateConfig({ blockImagePosition: pos })}
                className={clsx(
                  'text-[10px] font-bold px-2 py-1 rounded-lg border-2 transition-colors',
                  position === pos
                    ? 'bg-[#f97316] text-white border-[#f97316]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                )}
              >
                {pos === 'left' ? '← Left' : 'Right →'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Curated library */}
      {BLOCK_IMAGE_LIBRARY.map(category => (
        <div key={category.label}>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5" style={SG}>
            {category.label}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {category.images.map(({ seed, label, description }) => {
              const url = PICSUM_BLK(seed);
              const isActive = current === url;
              return (
                <button
                  key={seed}
                  onClick={() => onUpdateConfig({
                    blockImage: isActive ? null : url,
                    blockImagePosition: position,
                  })}
                  title={description ?? label}
                  className="relative rounded-lg overflow-hidden transition-all group"
                  style={{
                    border: isActive ? '2px solid #f97316' : '2px solid #d1d5db',
                    boxShadow: isActive ? '0 0 0 2px #f97316' : 'none',
                    aspectRatio: '4/3',
                  }}
                >
                  <img
                    src={url} alt={label} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 flex items-end bg-transparent group-hover:bg-black/30 transition-colors duration-150">
                    <span
                      className="w-full px-1 py-0.5 text-[8px] font-bold text-white text-center leading-tight opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={SG}
                    >
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
const FONT_OPTIONS = [
  { label: 'Inter',             value: 'Inter, system-ui, sans-serif'                },
  { label: 'Space Grotesk',     value: 'Space Grotesk, system-ui, sans-serif'        },
  { label: 'Playfair Display',  value: 'Playfair Display, Georgia, serif'            },
  { label: 'Roboto',            value: 'Roboto, system-ui, sans-serif'               },
  { label: 'Poppins',           value: 'Poppins, system-ui, sans-serif'              },
  { label: 'Lato',              value: 'Lato, system-ui, sans-serif'                 },
  { label: 'Georgia',           value: 'Georgia, serif'                              },
  { label: 'System UI',         value: 'system-ui, sans-serif'                       },
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

        {/* Contrast warning */}
        {(() => {
          const bg = theme.backgroundColor ?? '#FFFFFF';
          const qc = theme.questionColor   ?? '#111111';
          const ratio = contrastRatio(bg, qc);
          if (ratio >= 4.5) return null;
          return (
            <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-700">⚠ Low contrast ({ratio.toFixed(1)}:1)</p>
              <p className="text-[10px] text-amber-600 mt-0.5 leading-snug">
                Block color vs. question text may be hard to read — WCAG AA requires 4.5:1.
              </p>
            </div>
          );
        })()}

        {/* ── SECTION 3: Block Image ── */}
        <SectionHeader label="Block Image" />
        <p className="px-4 text-[10px] text-gray-400 leading-relaxed mb-1">
          Add a photo inside the selected block — it appears in a split layout alongside the question.
        </p>
        <BlockImagePicker
          selectedQuestion={selectedQuestion}
          onUpdateConfig={handleBlockImageConfig}
        />

        {/* ── Font ── */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" style={SG}>Font</p>
          <select
            value={theme.fontFamily ?? 'Playfair Display, Georgia, serif'}
            onChange={e => updateTheme({ fontFamily: e.target.value })}
            className="w-full border-2 border-[#111] rounded-xl px-3 py-2 text-sm font-medium text-[#111] bg-white outline-none focus:border-[#f97316]"
            style={SG}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
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
