import { useState, useRef, useEffect } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, ImageOff } from 'lucide-react';
import { useBuilderStore } from '@/stores/builderStore';
import ThemeGalleryModal from './ThemeGalleryModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import toast from 'react-hot-toast';

const SG = { fontFamily: 'Space Grotesk, system-ui, sans-serif' };

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Space Grotesk', value: 'Space Grotesk, system-ui, sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display, Georgia, serif' },
  { label: 'Roboto', value: 'Roboto, system-ui, sans-serif' },
  { label: 'Poppins', value: 'Poppins, system-ui, sans-serif' },
  { label: 'Lato', value: 'Lato, system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
];

function ColorSwatch({ label, value, onChange }) {
  const [localHex, setLocalHex] = useState(value ?? '#000000');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Sync local state when parent value changes
  useEffect(() => { setLocalHex(value ?? '#000000'); }, [value]);

  // Close on outside click
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

  const PRESET_COLORS = [
    '#111111', '#1e293b', '#0f172a', '#134e4a', '#14532d', '#7c1d1d', '#1e1b4b',
    '#ffffff', '#f8fafc', '#fefce8', '#fff1f2', '#f0fdf4', '#eff6ff', '#fce7f3',
    '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#22c55e', '#f59e0b', '#ef4444',
    '#7c3aed', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#06b6d4', '#84cc16',
  ];

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
          <span
            className="w-5 h-5 rounded border border-gray-300 shrink-0"
            style={{ backgroundColor: localHex }}
          />
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border-2 border-[#111] p-3 w-56"
            style={{ boxShadow: '4px 4px 0 #111' }}
          >
            {/* Native color picker */}
            <div className="flex gap-2 mb-3">
              <input
                type="color"
                value={localHex}
                onChange={e => { setLocalHex(e.target.value); onChange(e.target.value); }}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[#111] p-0.5"
              />
              <input
                type="text"
                value={localHex}
                onChange={e => handleHexInput(e.target.value)}
                className="flex-1 text-xs font-mono border-2 border-[#111] rounded-lg px-2 outline-none focus:border-[#f97316]"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
            {/* Preset swatches */}
            <div className="grid grid-cols-7 gap-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setLocalHex(c); onChange(c); }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PICSUM = (seed) => `https://picsum.photos/seed/${seed}/1600/900`;

const STOCK_PHOTOS = [
  { seed: 'nature-landscape', label: 'Nature' },
  { seed: 'city-architecture', label: 'City' },
  { seed: 'abstract-pattern', label: 'Abstract' },
  { seed: 'office-workspace', label: 'Office' },
  { seed: 'technology-minimal', label: 'Tech' },
  { seed: 'gradient-pastel', label: 'Soft' },
  { seed: 'mountains-aerial', label: 'Aerial' },
  { seed: 'ocean-waves', label: 'Ocean' },
  { seed: 'forest-morning', label: 'Forest' },
  { seed: 'dark-moody', label: 'Dark' },
  { seed: 'minimal-white', label: 'Minimal' },
  { seed: 'people-community', label: 'People' },
];

function BackgroundImagePicker({ theme, updateTheme }) {
  const current = theme.backgroundImage ?? null;

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" style={SG}>Background Image</p>

      {/* Current image or placeholder */}
      <div className="relative w-full h-20 rounded-xl border-2 border-[#111] overflow-hidden mb-2"
        style={{ boxShadow: '2px 2px 0 #111', background: current ? undefined : '#f1f5f9' }}
      >
        {current ? (
          <>
            <img src={current} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => updateTheme({ backgroundImage: null })}
              title="Remove image"
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-white border border-gray-300 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
            >
              <ImageOff className="w-3 h-3 text-gray-600" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-xs text-gray-400">No image — solid color used</p>
          </div>
        )}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {STOCK_PHOTOS.map(({ seed, label }) => {
          const url = PICSUM(seed);
          const isActive = current === url;
          return (
            <button
              key={seed}
              onClick={() => updateTheme({ backgroundImage: isActive ? null : url })}
              title={label}
              className="relative rounded-lg overflow-hidden border-2 transition-all"
              style={{
                border: isActive ? '2px solid #f97316' : '2px solid #d1d5db',
                boxShadow: isActive ? '0 0 0 2px #f97316' : 'none',
                aspectRatio: '16/9',
              }}
            >
              <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                <span className="text-[8px] font-bold text-white drop-shadow" style={SG}>{label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DesignPanel({ onClose }) {
  const { form, updateTheme, toggleDesignPanel, save } = useBuilderStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [showGallery, setShowGallery] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: formsData } = useQuery({
    queryKey: ['forms', activeWorkspaceId],
    queryFn: () => api.forms.list(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  if (!form) return null;

  const theme = form.theme ?? {};

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

        {/* Theme Gallery button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setShowGallery(true)}
            className="w-full py-2.5 text-sm font-bold border-2 border-[#111] rounded-xl bg-white text-[#111] hover:bg-[#FFFBF2] transition-all hover:-translate-y-px"
            style={{ boxShadow: '3px 3px 0 #111', ...SG }}
          >
            Open Theme Gallery
          </button>
        </div>

        {/* Background Image */}
        <BackgroundImagePicker theme={theme} updateTheme={updateTheme} />

        {/* Colors */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1" style={SG}>Colors</p>
          <ColorSwatch
            label="Background"
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

        {/* Font */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" style={SG}>Font</p>
          <select
            value={theme.fontFamily ?? 'Inter, system-ui, sans-serif'}
            onChange={e => updateTheme({ fontFamily: e.target.value })}
            className="w-full border-2 border-[#111] rounded-xl px-3 py-2 text-sm font-medium text-[#111] bg-white outline-none focus:border-[#f97316]"
            style={SG}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Alignment */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2" style={SG}>Alignment</p>
          <div className="flex gap-2">
            {[
              { value: 'left',   Icon: AlignLeft },
              { value: 'center', Icon: AlignCenter },
              { value: 'right',  Icon: AlignRight },
            ].map(({ value, Icon }) => (
              <button
                key={value}
                onClick={() => updateTheme({ alignment: value })}
                className={`flex-1 py-2 rounded-xl border-2 border-[#111] flex items-center justify-center transition-all ${
                  (theme.alignment ?? 'left') === value
                    ? 'bg-[#111] text-white'
                    : 'bg-white text-[#111] hover:bg-gray-50'
                }`}
                style={{ boxShadow: '2px 2px 0 #111' }}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save / Cancel */}
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
